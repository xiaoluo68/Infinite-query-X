"""猫眼演出公开接口适配器。

猫眼没有面向个人开发者的开放平台，这里只使用演出频道网页自己调用的
匿名 JSON 接口（m.dianping.com/myshow/ajax/*），不登录、不绕过风控、
不涉及下单。接口随时可能变化，所有失败都会以普通异常返回给上层。

数据只读：列表 / 搜索 / 详情 / 城市。
"""

from __future__ import annotations

import concurrent.futures
import html
import json
import random
import re
import sys
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

BASE = "https://m.dianping.com/myshow"
DETAIL_BASE = "https://show.maoyan.com/detail"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)
TIMEOUT = 15
PAGE_SIZE = 100
MAX_PAGES = 30
CACHE_SECONDS = 120

# 全国聚合：只取热门城市的第一页，避免一次请求上千个城市。
NATIONAL_CITIES = (1, 10, 20, 30, 59, 50, 57, 55, 42, 45, 70, 40, 80, 73, 60, 56)

CATEGORY_NAMES = {
    1: "演唱会",
    2: "体育赛事",
    3: "戏曲艺术",
    4: "话剧音乐剧",
    5: "舞蹈芭蕾",
    6: "音乐会",
    7: "亲子演出",
    8: "其他",
    9: "休闲展览",
    10: "音乐节",
    12: "电竞赛事",
    14: "沉浸剧场",
    15: "脱口秀",
    16: "相声",
    17: "Livehouse",
}

STATUS_MAP = {
    1: "未开售",
    2: "预售中",
    3: "预售中",
    4: "已售罄",
    5: "已结束",
    11: "未开售",
    12: "已结束",
}

_LOCK = threading.RLock()
_CACHE: dict[str, tuple[float, Any]] = {}
_CITIES: list[dict[str, Any]] | None = None


def _root() -> Path:
    return Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))


def _cache_get(key: str) -> Any | None:
    with _LOCK:
        hit = _CACHE.get(key)
    if not hit:
        return None
    stamp, value = hit
    if time.monotonic() - stamp > CACHE_SECONDS:
        return None
    return value


def _cache_put(key: str, value: Any) -> Any:
    with _LOCK:
        _CACHE[key] = (time.monotonic(), value)
    return value


def _get(path: str) -> dict[str, Any]:
    url = path if path.startswith("http") else BASE + path
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://show.maoyan.com/",
        "Origin": "https://show.maoyan.com",
    }
    last: Exception | None = None
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                raw = resp.read()
            payload = json.loads(raw.decode("utf-8", "replace"))
            if not isinstance(payload, dict):
                raise ValueError("猫眼接口返回格式异常")
            if payload.get("code") not in (None, 200):
                raise ValueError(f"猫眼接口提示：{payload.get('msg') or payload.get('code')}")
            return payload
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt == 0:
                time.sleep(0.25 + random.random() * 0.25)
    raise RuntimeError(f"猫眼请求失败：{last}")


def _list_path(city_id: int, page: int, size: int, keyword: str = "", category: int = 0) -> str:
    key = f";k={urllib.parse.quote(keyword)};" if keyword else ";"
    return (
        f"/ajax/performances/{int(category)};st=0{key}p={int(page)};s={int(size)};tft=0"
        f"?cityId={int(city_id)}&sellChannel=7"
    )


def _search_path(keyword: str, page: int, size: int) -> str:
    return _list_path(10, page, size, keyword=keyword, category=0)


def cities() -> list[dict[str, Any]]:
    """返回猫眼全部城市：id / name / pinyin / letter。"""
    global _CITIES
    with _LOCK:
        if _CITIES is not None:
            return _CITIES
    path = _root() / "maoyan_cities.json"
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise RuntimeError(f"猫眼城市数据缺失：{exc}") from exc
    out: list[dict[str, Any]] = []
    seen: set[int] = set()
    for item in raw if isinstance(raw, list) else []:
        try:
            cid = int(item.get("id"))
        except (TypeError, ValueError):
            continue
        name = str(item.get("name") or "").strip()
        if not name or cid in seen:
            continue
        seen.add(cid)
        pinyin = str(item.get("py") or "").strip().lower()
        letter = (pinyin[:1] or "#").upper()
        if not letter.isalpha():
            letter = "#"
        out.append(
            {
                "id": cid,
                "name": name,
                "pinyin": pinyin,
                "letter": letter,
                "fullname": f"{name} {pinyin}".strip(),
                "platform": "maoyan",
            }
        )
    out.sort(key=lambda c: (c["letter"] == "#", c["letter"], c["pinyin"], c["id"]))
    with _LOCK:
        _CITIES = out
    return out


def city_by_name(name: str) -> dict[str, Any] | None:
    target = str(name or "").strip()
    if not target or target in ("全国", "全國"):
        return None
    for city in cities():
        if city["name"] == target:
            return city
    return None


def _bucket(category_id: int, category_name: str) -> str:
    if category_id == 9:
        return "展览"
    if category_id in (2, 12):
        return "赛事"
    if category_id == 8:
        return "本地生活"
    if category_name in ("休闲展览", "展览"):
        return "展览"
    return "演出"


def _clean_text(value: Any, limit: int = 800) -> str:
    text = str(value or "")
    if not text:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t\u3000]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:limit]


def normalize(item: dict[str, Any]) -> dict[str, Any]:
    pid = item.get("performanceId") or item.get("id")
    category_id = int(item.get("categoryId") or 0)
    category_name = CATEGORY_NAMES.get(category_id, "演出")
    status = STATUS_MAP.get(int(item.get("ticketStatus") or 0), "未知")
    if item.get("stockOut"):
        status = "已售罄"
    price = str(item.get("priceRange") or "").strip()
    if not price:
        price = str((item.get("sellPriceDisplay") or {}).get("priceDisplayText") or "").strip()
    if price and not price.startswith("￥") and price[0].isdigit():
        price = "￥" + price
    poster = str(item.get("posterUrl") or "").strip()
    if poster.startswith("//"):
        poster = "https:" + poster
    return {
        "platform": "maoyan",
        "id": str(pid or ""),
        "rawId": pid,
        "name": str(item.get("name") or item.get("shortName") or "").strip(),
        "city": str(item.get("cityName") or "").strip(),
        "venue": str(item.get("shopName") or "").strip(),
        "address": str(item.get("address") or "").strip(),
        "date": str(item.get("showTimeRange") or "").strip(),
        "saleAt": "",
        "price": price or "—",
        "status": status,
        "url": f"{DETAIL_BASE}/{pid}" if pid else "https://show.maoyan.com/",
        "poster": poster,
        "category": category_name,
        "bucket": _bucket(category_id, category_name),
        "score": str(item.get("score") or "").strip(),
        "stockOut": bool(item.get("stockOut")),
        "ticketStatus": int(item.get("ticketStatus") or 0),
    }


def _fetch_page(city_id: int, page: int, size: int, keyword: str = "") -> dict[str, Any]:
    payload = _get(_list_path(city_id, page, size, keyword))
    data = payload.get("data")
    items = data if isinstance(data, list) else []
    paging = payload.get("paging") or {}
    return {
        "items": [normalize(item) for item in items if isinstance(item, dict)],
        "total": int(paging.get("totalHits") or 0),
        "hasMore": bool(paging.get("hasMore")),
        "page": int(paging.get("pageNo") or page),
    }


def pool(city_id: int, keyword: str = "", force: bool = False) -> dict[str, Any]:
    """按城市抓取全部列表（每页 100 条）。city_id=0 表示全国热门城市聚合。"""
    city_id = int(city_id or 0)
    keyword = str(keyword or "").strip()
    key = f"pool:{city_id}:{keyword}"
    if not force:
        cached = _cache_get(key)
        if cached is not None:
            return cached

    if city_id == 0 and not keyword:
        return _cache_put(key, _national_pool())

    first = _fetch_page(city_id, 1, PAGE_SIZE, keyword)
    items: list[dict[str, Any]] = list(first["items"])
    total = int(first["total"] or 0)
    partial = False
    pages = min(MAX_PAGES, max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)) if total else 1
    if first["hasMore"] and pages > 1:
        def more(page_no: int) -> tuple[int, list[dict[str, Any]]] | None:
            try:
                return page_no, _fetch_page(city_id, page_no, PAGE_SIZE, keyword)["items"]
            except Exception:  # noqa: BLE001
                return None

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool_exec:
            for result in pool_exec.map(more, range(2, pages + 1)):
                if result is None:
                    partial = True
                    continue
                items.extend(result[1])
    # 同一演出在个别城市列表中可能重复出现
    uniq: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items:
        if not item["id"] or item["id"] in seen:
            continue
        seen.add(item["id"])
        uniq.append(item)
    result = {
        "ok": True,
        "platform": "maoyan",
        "city": city_id,
        "keyword": keyword,
        "items": uniq,
        "total": total or len(uniq),
        "partial": partial,
        "national": False,
    }
    return _cache_put(key, result)


def _national_pool() -> dict[str, Any]:
    def one(cid: int) -> list[dict[str, Any]]:
        try:
            return _fetch_page(cid, 1, PAGE_SIZE)["items"]
        except Exception:  # noqa: BLE001
            return []

    merged: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool_exec:
        for part in pool_exec.map(one, NATIONAL_CITIES):
            merged.extend(part)
    uniq: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in merged:
        if not item["id"] or item["id"] in seen:
            continue
        seen.add(item["id"])
        uniq.append(item)
    order = {"预售中": 0, "未开售": 1, "暂时售罄": 2, "已售罄": 3, "已结束": 4, "未知": 5}
    uniq.sort(key=lambda x: (order.get(x["status"], 9), x["date"]))
    return {
        "ok": True,
        "platform": "maoyan",
        "city": 0,
        "keyword": "",
        "items": uniq,
        "total": len(uniq),
        "partial": True,
        "national": True,
        "cities": len(NATIONAL_CITIES),
    }


def search(keyword: str, force: bool = False) -> dict[str, Any]:
    keyword = str(keyword or "").strip()
    if not keyword:
        return {"ok": True, "platform": "maoyan", "items": [], "total": 0, "partial": False}
    key = f"search:{keyword}"
    if not force:
        cached = _cache_get(key)
        if cached is not None:
            return cached
    items: list[dict[str, Any]] = []
    page = 1
    total = 0
    while page <= 6:
        payload = _get(_search_path(keyword, page, PAGE_SIZE))
        data = payload.get("data")
        chunk = [normalize(x) for x in data if isinstance(x, dict)] if isinstance(data, list) else []
        total = int((payload.get("paging") or {}).get("totalHits") or total)
        items.extend(chunk)
        if not (payload.get("paging") or {}).get("hasMore") or not chunk:
            break
        page += 1
        time.sleep(0.08)
    uniq: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items:
        if item["id"] and item["id"] not in seen:
            seen.add(item["id"])
            uniq.append(item)
    result = {
        "ok": True,
        "platform": "maoyan",
        "items": uniq,
        "total": total or len(uniq),
        "partial": False,
        "keyword": keyword,
    }
    return _cache_put(key, result)


def detail(performance_id: str | int) -> dict[str, Any]:
    pid = str(performance_id).strip()
    if not pid.isdigit():
        raise ValueError("演出 ID 不正确")
    payload = _get(f"/ajax/performance/{pid};poi=false")
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ValueError("猫眼没有返回该演出的详情")
    item = normalize(data)
    item["description"] = _clean_text(data.get("detail") or data.get("summary"), 1200)
    remind = data.get("saleRemindVO") or {}
    on_sale = remind.get("onSaleTime")
    if isinstance(on_sale, (int, float)) and on_sale > 0:
        try:
            item["saleAt"] = time.strftime("%Y-%m-%d %H:%M", time.localtime(on_sale / 1000))
            item["saleStart"] = int(on_sale / 1000)
        except (OSError, ValueError):
            pass
    return item


def clear_cache() -> None:
    with _LOCK:
        _CACHE.clear()
