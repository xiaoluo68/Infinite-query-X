"""BW2026 会员购监测 —— 图形界面版（Motrix × HyperOS 4 柔光玻璃动效）

启动一个本地 HTTP 服务，前端是打包在 exe 里的静态页面；
再用 Edge 的「应用窗口」模式打开，看起来就是一个独立桌面程序。

后端职责：
  * 提供 /api/* 接口（搜索、全国列表、任务管理、状态）
  * 每个监控任务一个线程，轮询会员购接口，维护票种状态
  * 前端关掉后自动退出（一段时间没有心跳）
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import mimetypes
import os
import random
import subprocess
import sys
import threading
import time
import traceback
import urllib.parse
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def _early_streams():
    """无控制台打包后 stdout/stderr 是 None，先把它们接到启动日志上。

    这样 colorama 之类的库不会炸，真出问题也能在 startuplog 里看到堆栈。
    """
    base = os.environ.get("BW_STATE_DIR")
    if not base:
        temp = os.environ.get("TEMP") or os.environ.get("TMP") or "."
        base = os.path.join(temp, "BW2026Monitor")
    stream = None
    try:
        os.makedirs(base, exist_ok=True)
        stream = open(os.path.join(base, "startup.log"), "w", encoding="utf-8", buffering=1)
    except OSError:
        stream = open(os.devnull, "w", encoding="utf-8")
    if sys.stdout is None:
        sys.stdout = stream
    if sys.stderr is None:
        sys.stderr = stream


_early_streams()

from pathlib import Path  # noqa: E402
from typing import Any  # noqa: E402

_ROOT = Path(__file__).resolve().parent
if str(_ROOT.parent) not in sys.path:  # 源码运行时，核心模块在上一层
    sys.path.insert(0, str(_ROOT.parent))

import bili_ticket_monitor_search as core  # noqa: E402
from notify_hub import NotifyHub  # noqa: E402

APP_NAME = "Infinite query X"
APP_VERSION = "1.1.2"
APP_BUILD = "20261022.3"  # 每次打包递增；用来识别残留的旧实例
APP_AUTHOR = "小羅同学"
APP_CONTACT = "https://t.me/InfinitequeryX"
APP_REPO = "https://github.com/TaiMiao/Bili_Ticket_Monitor"
APP_GITHUB = "https://github.com/xiaoluo68/Infinite-query-X"
APP_DESCRIPTION = (
    "基于 TaiMiao 的 Bili_Ticket_Monitor 项目开发，"
    "实时监测 Bilibili 会员购漫展演出赛事的余票状态（无抢票功能），"
    "只做余票监测，不提供抢票 / 下单功能。"
    "界面动效参考 Xiaomi HyperOS 4 的柔光玻璃与弹性反馈，"
    "支持基于官方 Material Color Utilities 的 Monet / Material 3 Expressive 动态取色，"
    "以及最小化/关闭到托盘、隐藏任务栏图标等桌面窗口行为。"
    "原项目：https://github.com/TaiMiao/Bili_Ticket_Monitor"
)

BASE_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
STATIC_DIR = BASE_DIR / "static"


def _asset_fingerprint() -> str:
    """静态页面内容的指纹：界面一改，残留的旧实例就不会被复用。"""
    import hashlib

    digest = hashlib.sha256()
    for name in ("index.html", "app.css", "app.js"):
        try:
            digest.update((STATIC_DIR / name).read_bytes())
        except OSError:
            pass
    return digest.hexdigest()[:16]


ASSET_ID = _asset_fingerprint()


def _state_dir() -> Path:
    """配置/端口/窗口数据放哪：优先 LOCALAPPDATA，写不进去再退到临时目录。"""
    candidates = []
    override = os.environ.get("BW_STATE_DIR")
    if override:
        candidates.append(Path(override))
    local = os.environ.get("LOCALAPPDATA")
    if local:
        candidates.append(Path(local) / "BW2026Monitor")
    temp = os.environ.get("TEMP") or os.environ.get("TMP")
    if temp:
        candidates.append(Path(temp) / "BW2026Monitor")
    candidates.append(Path.cwd() / ".bwmonitor")
    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate
        except OSError:
            continue
    return Path.cwd()


STATE_DIR = _state_dir()
CONFIG_FILE = STATE_DIR / "config.json"
PORT_FILE = STATE_DIR / "port.json"
FONT_DIR = STATE_DIR / "fonts"
FONTS_FILE = STATE_DIR / "fonts.json"
_FONT_LOCK = threading.Lock()
FONT_MIME = {
    "ttf": "font/ttf",
    "otf": "font/otf",
    "woff": "font/woff",
    "woff2": "font/woff2",
}


def _safe_font_id(value: Any) -> bool:
    text = str(value or "")
    return 4 <= len(text) <= 40 and all(ch in "0123456789abcdef" for ch in text)


def _load_custom_fonts() -> list[dict[str, Any]]:
    """读取用户导入的字体清单；文件不存在的条目自动丢弃。"""
    try:
        FONT_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        return []
    try:
        raw = json.loads(FONTS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    if not isinstance(raw, list):
        return []
    fonts = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        font_id = str(item.get("id") or "")
        name = str(item.get("name") or "").strip()
        ext = str(item.get("ext") or "").lower()
        if not _safe_font_id(font_id) or not name or ext not in FONT_MIME:
            continue
        path = FONT_DIR / f"{font_id}.{ext}"
        if not path.is_file():
            continue
        fonts.append(
            {
                "id": font_id,
                "name": name[:60],
                "file": path.name,
                "ext": ext,
                "size": int(item.get("size") or path.stat().st_size),
                "family": f"IQXFont_{font_id}",
            }
        )
    return fonts


def _save_custom_fonts(fonts: list[dict[str, Any]]) -> None:
    try:
        FONTS_FILE.write_text(json.dumps(fonts, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError:
        pass


CUSTOM_FONTS: list[dict[str, Any]] = _load_custom_fonts()


DEFAULT_SETTINGS = {
    "interval": core.Config.REFRESH_INTERVAL,
    "timeout": core.Config.TIMEOUT,
    "log": core.Config.ENABLE_LOG,
    "theme": "system",
    "language": "zh-CN",
    # 界面动画帧率：fpsUnlimited 控制无限制；fpsMax 是前端检测到的刷新率上限（30–600）
    "fps": 60,
    "fpsUnlimited": True,
    "fpsMax": 600,
    # Monet / Material 3 Expressive 动态取色；关闭时保持当前配色
    "monet": False,
    "monetSeed": "#0a84ff",
    # 卡片流光颜色：rainbow 或 #rrggbb
    "edgeColor": "rainbow",
    # 界面字体：family 预设、字号 px、字重
    "fontFamily": "system",
    "fontSize": 14,
    "fontWeight": 400,
    # 桌面窗口行为（Windows / Edge 应用窗口）
    "desktopMinimizeToTray": False,
    "desktopCloseToTray": False,
    "desktopHideTaskbar": False,
    "desktopHideFullscreen": False,
    # 提醒弹窗：新活动 / 开票、关注城市（0=全国）、位置、停留毫秒
    "notifyNew": True,
    "notifySale": True,
    "notifyCity": 0,
    "notifyPos": "br",
    "notifyDuration": 6000,
    # 整体动效等级：full / soft / lite / off
    "motion": "full",
}


def load_settings() -> dict[str, Any]:
    settings = dict(DEFAULT_SETTINGS)
    try:
        raw = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            settings.update({k: raw[k] for k in DEFAULT_SETTINGS if k in raw})
    except (OSError, ValueError):
        pass
    # 旧配置可能存过 1 fps，统一收敛到 30–600
    try:
        settings["fps"] = max(30, min(600, int(settings.get("fps", 60))))
    except (TypeError, ValueError):
        settings["fps"] = 60
    try:
        settings["fpsMax"] = max(30, min(600, int(settings.get("fpsMax", 600))))
    except (TypeError, ValueError):
        settings["fpsMax"] = 600
    seed = str(settings.get("monetSeed", "#0a84ff")).strip()
    if len(seed) == 7 and seed.startswith("#"):
        try:
            int(seed[1:], 16)
            settings["monetSeed"] = seed.lower()
        except ValueError:
            settings["monetSeed"] = "#0a84ff"
    else:
        settings["monetSeed"] = "#0a84ff"
    settings["monet"] = bool(settings.get("monet", False))
    edge = str(settings.get("edgeColor", "rainbow")).strip().lower()
    if edge != "rainbow":
        valid = len(edge) == 7 and edge.startswith("#")
        if valid:
            try:
                int(edge[1:], 16)
            except ValueError:
                valid = False
        edge = edge if valid else "rainbow"
    settings["edgeColor"] = edge
    family = str(settings.get("fontFamily") or "system").strip()
    if family not in ("system", "yahei", "segoe", "serif", "mono"):
        if not (family.startswith("custom:") and _safe_font_id(family[7:])):
            family = "system"
    settings["fontFamily"] = family
    try:
        settings["fontSize"] = max(12, min(20, int(settings.get("fontSize", 14))))
    except (TypeError, ValueError):
        settings["fontSize"] = 14
    try:
        weight = int(settings.get("fontWeight", 400))
    except (TypeError, ValueError):
        weight = 400
    settings["fontWeight"] = weight if weight in (400, 500, 600) else 400
    settings["notifyNew"] = bool(settings.get("notifyNew", True))
    settings["notifySale"] = bool(settings.get("notifySale", True))
    try:
        settings["notifyCity"] = max(0, int(settings.get("notifyCity", 0)))
    except (TypeError, ValueError):
        settings["notifyCity"] = 0
    pos = str(settings.get("notifyPos") or "br").lower()
    settings["notifyPos"] = pos if pos in ("br", "bl", "tr", "tl", "island") else "br"
    try:
        settings["notifyDuration"] = max(3000, min(15000, int(settings.get("notifyDuration", 6000))))
    except (TypeError, ValueError):
        settings["notifyDuration"] = 6000
    motion = str(settings.get("motion") or "full").lower()
    settings["motion"] = motion if motion in ("full", "soft", "lite", "off") else "full"
    return settings


def save_settings(settings: dict[str, Any]) -> None:
    payload = {k: settings.get(k, v) for k, v in DEFAULT_SETTINGS.items()}
    try:
        CONFIG_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError:
        pass


# ---------------- 数据拉取 ----------------
_SEARCH_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_ALL_LOCK = threading.Lock()
_ALL_STATE: dict[str, Any] = {
    "stamp": 0.0,
    "running": False,
    "projects": [],
    "error": "",
    "progress": {"done": 0, "total": 0},
}


def _session() -> "core.requests.Session":
    return core.Monitor._build_session()


def project_to_dict(project: "core.Project") -> dict[str, str]:
    return {
        "id": project.project_id,
        "name": project.name,
        "city": project.city,
        "date": project.date,
        "endDate": project.date,
        "venue": "",
        "category": classify_category(project.name),
        "saleAt": project.sale_at,
        "saleStart": 0,
        "cityId": 0,
        "price": project.price,
        "status": project.status,
        "url": f"https://show.bilibili.com/platform/detail.html?id={project.project_id}",
    }


def classify_category(name: str, p_type: str = "") -> str:
    """把活动归到「展览 / 演出 / 赛事 / 同人展 / 本地生活 / 其他」。"""
    if p_type in ("展览", "演出", "赛事", "本地生活", "only同人展"):
        return "同人展" if p_type == "only同人展" else p_type
    text = str(name or "")
    lower = text.lower()
    if "only" in lower or "同人" in text:
        return "同人展"
    if any(word in text for word in ("漫展", "嘉年华", "展览", "展会", "展")):
        return "展览"
    if any(word in text for word in ("演出", "音乐会", "演唱会", "舞台", "剧场", "live")):
        return "演出"
    if any(word in text for word in ("赛", "比赛", "锦标赛", "联赛")):
        return "赛事"
    return "其他"


def search_pool(keyword: str, limit: int = 8, size: int = 20) -> dict[str, Any]:
    """一次取回多页搜索结果（遇到重复/末页就停），前端再按 16 条一页分页。

    会员购的无限流接口没有可靠的总页数，逐页请求还会偶发重复；
    先合并成一个结果池，翻页就完全在本地做，页码和末页都准确。
    """
    key = f"pool|{keyword}|{size}"
    hit = _SEARCH_CACHE.get(key)
    if hit and time.monotonic() - hit[0] < 120:
        return dict(hit[1])
    merged: list[dict] = []
    seen: set[str] = set()
    partial = True
    session = _session()
    core._warm_session(session)
    try:
        for page in range(1, max(1, min(12, limit)) + 1):
            projects, _total, last = core.search_projects_page(
                session, keyword, core.Config.TIMEOUT, size, page=page
            )
            fresh = [item for item in projects if item.project_id not in seen]
            for project in fresh:
                seen.add(project.project_id)
                merged.append(project_to_dict(project))
            if last or len(projects) < size or not fresh:
                partial = False
                break
            time.sleep(core.Config.BROWSE_REQUEST_GAP)
    finally:
        session.close()
    payload = {
        "items": merged,
        "total": len(merged),
        "pages": max(1, -(-len(merged) // 16)),
        "partial": partial,
        "pagesize": 16,
    }
    _SEARCH_CACHE[key] = (time.monotonic(), payload)
    return dict(payload)


# 会员购「类型」栏目：p_type 直接传中文分类名
CATEGORY_TYPES = ("", "全部类型", "展览", "演出", "赛事", "本地生活", "only同人展")
CITY_AREAS = {
    "全国": 0,
    "北京": 110100,
    "上海": 310100,
    "杭州": 330100,
    "广州": 440100,
    "深圳": 440300,
    "成都": 510100,
    "武汉": 420100,
    "天津": 120100,
    "南京": 320100,
}
_LIST_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_PAGE_PROBE_CACHE: dict[str, tuple[float, int]] = {}


def _list_item_to_dict(item: dict, p_type: str = "") -> dict[str, str] | None:
    """把 project/listV2 的一条结果转成和搜索结果一样的结构。"""
    project_id = str(item.get("id") or item.get("project_id") or "").strip()
    name = str(item.get("project_name") or "").strip()
    if not project_id or not name:
        return None

    sale_at = "-"
    try:
        stamp = int(item.get("sale_start_time") or item.get("sale_start") or 0)
        if stamp > 0:
            sale_at = datetime.fromtimestamp(stamp).strftime("%m-%d %H:%M")
    except (TypeError, ValueError, OSError):
        pass

    price = str(item.get("price_text") or "").strip()
    if not price:
        try:
            low = float(item.get("price_low") or 0) / 100
            price = f"￥{low:g}起" if low else "-"
        except (TypeError, ValueError):
            price = "-"

    start = str(item.get("start_time") or "")[:10]
    end = str(item.get("end_time") or "")[:10]
    if not end or end < start:
        end = start

    return {
        "id": project_id,
        "name": name,
        "city": str(item.get("city") or "").strip(),
        "date": start or "-",
        "endDate": end or start or "-",
        "venue": str(item.get("venue_name") or "").strip(),
        "category": classify_category(name, p_type),
        "saleAt": sale_at,
        "saleStart": int(item.get("sale_start_time") or item.get("sale_start") or 0)
        if str(item.get("sale_start_time") or item.get("sale_start") or "").isdigit()
        else 0,
        "cityId": int(item.get("cityId") or item.get("city_id") or 0),
        "price": price,
        "status": str(item.get("sale_flag") or "").strip(),
        "url": f"https://show.bilibili.com/platform/detail.html?id={project_id}",
    }


def list_projects_page(
    session: "core.requests.Session",
    p_type: str = "",
    area: int = 0,
    page: int = 1,
    pagesize: int = 16,
) -> tuple[list[dict], bool, int]:
    """拉一页列表，返回 (items, 是否末页, 接口累计条数)。

    线上接口的 total 是「累计已经返回过的条数」，不是总条数；末页只能看
    isLastBrush 或本页是否不足 pagesize。
    """
    if p_type == "":
        p_type = "全部类型"
    params = {
        "version": 134,
        "platform": "web",
        "page": max(1, page),
        "pagesize": pagesize,
        "area": area,
        "filter": "",
        "p_type": p_type,
    }
    url = "https://show.bilibili.com/api/ticket/project/listV2?" + urllib.parse.urlencode(params)
    response = session.get(url, headers=core.Config.HEADERS, timeout=core.Config.TIMEOUT)
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") not in (0, None):
        raise core.ApiError(f"列表接口返回错误 code={payload.get('code')}")
    data = payload.get("data") or {}
    results = data.get("result") or []
    items = []
    for raw in results:
        if isinstance(raw, dict):
            converted = _list_item_to_dict(raw, p_type)
            if converted:
                items.append(converted)
    try:
        total = int(data.get("total") or 0)
    except (TypeError, ValueError):
        total = 0
    last = bool(data.get("isLastBrush")) or len(items) < max(1, pagesize)
    return items, last, total


def list_projects(
    session: "core.requests.Session",
    p_type: str = "",
    area: int = 0,
    page: int = 1,
    pagesize: int = 16,
) -> list[dict]:
    return list_projects_page(session, p_type, area, page, pagesize)[0]


def category_pool(p_type: str, area: int = 0, limit: int = 12) -> dict[str, Any]:
    """把某个类型 / 城市的前若干页合并成一个结果池，供前端本地分页。"""
    if p_type not in CATEGORY_TYPES:
        p_type = ""
    if p_type == "全部类型":
        p_type = ""
    key = f"pool|{p_type}|{area}"
    hit = _LIST_CACHE.get(key)
    if hit and time.monotonic() - hit[0] < 120:
        return dict(hit[1])
    merged: list[dict] = []
    seen: set[str] = set()
    partial = True
    session = _session()
    core._warm_session(session)
    try:
        for page in range(1, max(1, min(16, limit)) + 1):
            items, last, _total = list_projects_page(session, p_type, area, page)
            fresh = [item for item in items if item["id"] not in seen]
            for item in fresh:
                seen.add(item["id"])
                merged.append(item)
            if last or len(items) < 16 or not fresh:
                partial = False
                break
            time.sleep(core.Config.BROWSE_REQUEST_GAP)
    finally:
        session.close()
    payload = {
        "items": merged,
        "total": len(merged),
        "pages": max(1, -(-len(merged) // 16)),
        "partial": partial,
        "pagesize": 16,
    }
    _LIST_CACHE[key] = (time.monotonic(), payload)
    return dict(payload)


def watch_items(city: int = 0) -> list[dict[str, Any]]:
    """提醒中心的轻量扫描：按类型取每个分类的前两页（10 个请求）。"""
    merged: dict[str, dict[str, Any]] = {}
    session = _session()
    core._warm_session(session)
    try:
        for p_type in LIST_P_TYPES:
            for page in (1, 2):
                try:
                    items, last, _total = list_projects_page(session, p_type, city, page)
                except Exception:  # noqa: BLE001 单个分类失败不影响别的
                    break
                for item in items:
                    merged.setdefault(item["id"], item)
                time.sleep(core.Config.BROWSE_REQUEST_GAP)
                if last:
                    break
    finally:
        session.close()
    return list(merged.values())


_CITY_CACHE: dict[str, Any] = {"stamp": 0.0, "list": []}


def fetch_cities(force: bool = False) -> list[dict[str, Any]]:
    """会员购支持的全部城市（含港澳台），带活动数量。"""
    if not force and _CITY_CACHE["list"] and time.monotonic() - float(_CITY_CACHE["stamp"]) < 3600:
        return _CITY_CACHE["list"]  # type: ignore[return-value]

    session = _session()
    try:
        url = "https://show.bilibili.com/api/ticket/city/list?channel=4"
        response = session.get(url, headers=core.Config.HEADERS, timeout=core.Config.TIMEOUT)
        response.raise_for_status()
        payload = response.json()
    finally:
        session.close()

    data = payload.get("data") or {}
    raw: list[dict] = list(data.get("list") or [])
    for group in data.get("more") or []:
        raw.extend(group.get("list") or [])

    seen: dict[int, dict[str, Any]] = {}
    for item in raw:
        try:
            city_id = int(item.get("id"))
        except (TypeError, ValueError):
            continue
        if city_id <= 0 or city_id in seen:
            continue
        seen[city_id] = {
            "id": city_id,
            "name": str(item.get("name") or "").strip(),
            "fullname": str(item.get("fullname") or "").strip(),
            "letter": (str(item.get("first_letter") or "#").strip().upper()[:1] or "#"),
            "num": int(item.get("num") or 0),
            "type": int(item.get("type") or 2),
        }

    cities = sorted(seen.values(), key=lambda c: (c["letter"], c["name"]))
    _CITY_CACHE["list"] = cities
    _CITY_CACHE["stamp"] = time.monotonic()
    return cities


LIST_P_TYPES = ("展览", "演出", "赛事", "本地生活", "only同人展")


def _publish_all(merged: dict[str, dict]) -> None:
    items = sorted(merged.values(), key=lambda p: (p["date"] == "-", p["date"]), reverse=True)
    with _ALL_LOCK:
        _ALL_STATE["projects"] = items


def fetch_all(force: bool = False) -> None:
    """后台拉全国展会，结果放进 _ALL_STATE（边拉边发布进度和增量结果）。"""
    with _ALL_LOCK:
        if _ALL_STATE["running"]:
            return
        if not force and time.monotonic() - float(_ALL_STATE["stamp"]) < core.Config.BROWSE_CACHE_SECONDS:
            if _ALL_STATE["projects"]:
                return
        _ALL_STATE["running"] = True
        _ALL_STATE["error"] = ""
        _ALL_STATE["progress"] = {"done": 0, "total": 0}
    try:
        merged: dict[str, dict] = {}
        total_steps = len(LIST_P_TYPES) * 8 + 7  # 5 个分类 × 最多 8 页 + 关键词补漏
        step = 0
        session = _session()
        core._warm_session(session)
        try:
            # 先按「类型」栏目把展览 / 演出 / 赛事 / 本地生活 / only同人展 都翻一遍
            for p_type in LIST_P_TYPES:
                for page in range(1, 9):
                    step += 1
                    with _ALL_LOCK:
                        _ALL_STATE["progress"] = {"done": step, "total": total_steps}
                    try:
                        items, last, _total = list_projects_page(session, p_type, 0, page)
                        for item in items:
                            merged.setdefault(item["id"], item)
                        if last:
                            break
                    except Exception:  # noqa: BLE001 单个分类失败不影响整体
                        pass
                    if step % 3 == 0:
                        _publish_all(merged)
                    time.sleep(core.Config.BROWSE_REQUEST_GAP)
            # 再用几个关键词补漏（有些漫展在分类里靠后）
            for keyword, pages in (("漫展", 3), ("同人", 2), ("演出", 2)):
                for page in range(1, pages + 1):
                    step += 1
                    with _ALL_LOCK:
                        _ALL_STATE["progress"] = {"done": step, "total": total_steps}
                    try:
                        for project in core.search_projects(
                            session, keyword, core.Config.TIMEOUT, 20, page=page
                        ):
                            merged.setdefault(project.project_id, project_to_dict(project))
                    except Exception:  # noqa: BLE001
                        pass
                    if step % 3 == 0:
                        _publish_all(merged)
                    time.sleep(core.Config.BROWSE_REQUEST_GAP)
        finally:
            session.close()
        _publish_all(merged)
        with _ALL_LOCK:
            _ALL_STATE["stamp"] = time.monotonic()
    except Exception as exc:  # noqa: BLE001
        with _ALL_LOCK:
            _ALL_STATE["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        with _ALL_LOCK:
            _ALL_STATE["running"] = False


# ---------------- 按日期查询 ----------------
def valid_day(text: str) -> bool:
    try:
        datetime.strptime(text, "%Y-%m-%d")
        return True
    except (TypeError, ValueError):
        return False


def filter_projects_by_date(projects: list[dict], day: str) -> list[dict]:
    """开始日期 ≤ day ≤ 结束日期 的活动；单日活动按当天匹配。"""
    matched = []
    for item in projects:
        start = str(item.get("date") or "")[:10]
        if not valid_day(start):
            continue
        end = str(item.get("endDate") or start)[:10]
        if not valid_day(end) or end < start:
            end = start
        if start <= day <= end:
            matched.append(item)
    matched.sort(key=lambda p: (p.get("category", ""), p.get("name", "")))
    return matched


# ---------------- 监控任务 ----------------
class Task:
    """一个展会的监控任务，线程里轮询，状态给前端读。"""

    def __init__(
        self, project_id: str, name: str, settings: dict[str, Any], city: str = ""
    ) -> None:
        self.project_id = project_id
        self.name = name or f"票务 {project_id}"
        self.city = city
        self.url = f"https://show.bilibili.com/platform/detail.html?id={project_id}"
        self.interval = max(1.0, float(settings.get("interval", 2.0)))
        self.timeout = max(1.0, float(settings.get("timeout", 10.0)))
        self.log_enabled = bool(settings.get("log", False))
        self.board = core.TicketBoard(core.Config.CONFIRM_UPDATES, core.Config.CONFIRM_REMOVALS)
        self.tickets: list[dict[str, str]] = []
        self.changes: list[dict[str, str]] = []
        self.polls = 0
        self.errors = 0
        self.last_error = ""
        self.started = time.time()
        self.updated = 0.0
        self.running = True
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True, name=f"task-{project_id}")
        self.lock = threading.Lock()

        # 回流统计：{票种key: {...}}
        self.stats: dict[tuple[str, str], dict[str, Any]] = {}
        self._last_tick = time.time()

    def start(self) -> None:
        self.thread.start()

    def stop(self) -> None:
        self.running = False
        self.stop_event.set()

    def _run(self) -> None:
        session = core.Monitor._build_session()
        url = core.Config.API_URL.format(ticket_id=self.project_id)
        try:
            while not self.stop_event.is_set():
                self.polls += 1
                try:
                    response = session.get(url, headers=core.Config.HEADERS, timeout=self.timeout)
                    response.raise_for_status()
                    name, tickets = core.parse_tickets(response.json())
                    self._accept(name, tickets)
                except Exception as exc:  # noqa: BLE001 任何异常都不让线程退出
                    self.errors += 1
                    self.last_error = f"{type(exc).__name__}: {exc}"
                if self.stop_event.wait(self.interval * random.uniform(0.85, 1.15)):
                    break
        finally:
            session.close()

    def _accept(self, name: str, tickets: list["core.Ticket"]) -> None:
        now = time.time()
        today = datetime.now().date()
        if name and name != "未知项目":
            self.name = name

        # 回流统计：只要状态是「预售中」就算可购，记录次数 / 最近可购 / 累计可购时长
        delta = max(0.0, min(now - self._last_tick, 60.0))
        self._last_tick = now
        for ticket in tickets:
            stat = self.stats.setdefault(
                ticket.key,
                {"status": "", "today": today, "restocks": 0, "total": 0, "last": 0.0, "secs": 0.0},
            )
            if stat["today"] != today:
                stat["today"] = today
                stat["restocks"] = 0
            available = ticket.status == "预售中"
            if available:
                if stat["status"] != "预售中":
                    stat["restocks"] += 1
                    stat["total"] += 1
                stat["last"] = now
                stat["secs"] += delta
            stat["status"] = ticket.status

        payload = []
        for ticket in tickets:
            stat = self.stats.get(ticket.key, {})
            payload.append(
                {
                    "screen": ticket.screen,
                    "desc": ticket.desc,
                    "status": ticket.status,
                    "ticketId": ticket.ticket_id,
                    "price": ticket.price,
                    "free": ticket.free,
                    "saleStart": ticket.sale_start,
                    "restocks": int(stat.get("restocks", 0)),
                    "total": int(stat.get("total", 0)),
                    "last": float(stat.get("last", 0.0)),
                    "secs": round(float(stat.get("secs", 0.0)), 0),
                }
            )

        self.last_error = ""
        self.updated = now
        opened: list[str] = []
        with self.lock:
            self.tickets = payload
            if not self.board.ready:
                self.board.seed(tickets)
            else:
                for change in self.board.update(tickets):
                    self.changes.insert(
                        0,
                        {
                            "kind": change.kind,
                            "name": change.name,
                            "old": change.old,
                            "new": change.new,
                            "at": datetime.now().strftime("%H:%M:%S"),
                        },
                    )
                    del self.changes[60:]
                    if change.kind == "状态变化" and change.new == "预售中" and change.old != "预售中":
                        opened.append(change.name)
        for ticket_name in opened:
            if NOTIFY_HUB is not None:
                NOTIFY_HUB.push_sale_task(
                    project_id=self.project_id,
                    name=self.name,
                    city=self.city,
                    url=self.url,
                    ticket=ticket_name,
                    price=next(
                        (t.price_text for t in tickets if t.name == ticket_name), ""
                    ),
                )

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            tickets = list(self.tickets)
            changes = list(self.changes[:8])
        return {
            "id": self.project_id,
            "name": self.name,
            "tickets": tickets,
            "changes": changes,
            "polls": self.polls,
            "errors": self.errors,
            "lastError": self.last_error,
            "started": self.started,
            "updated": self.updated,
            "running": self.running,
        }


class Manager:
    def __init__(self) -> None:
        self.tasks: dict[str, Task] = {}
        self.lock = threading.Lock()

    def start(
        self, project_id: str, name: str, settings: dict[str, Any], city: str = ""
    ) -> dict[str, Any]:
        with self.lock:
            task = self.tasks.get(project_id)
            if task and task.running:
                return task.snapshot()
            task = Task(project_id, name, settings, city)
            self.tasks[project_id] = task
            task.start()
            time.sleep(0.05)
            return task.snapshot()

    def stop(self, project_id: str) -> None:
        with self.lock:
            task = self.tasks.pop(project_id, None)
        if task:
            task.stop()

    def stop_all(self) -> None:
        with self.lock:
            tasks = list(self.tasks.values())
            self.tasks.clear()
        for task in tasks:
            task.stop()

    def snapshot(self) -> list[dict[str, Any]]:
        with self.lock:
            tasks = list(self.tasks.values())
        return [t.snapshot() for t in tasks]


MANAGER = Manager()
SETTINGS = load_settings()
NOTIFY_HUB: Any = None
try:
    NOTIFY_HUB = NotifyHub(
        STATE_DIR / "notify.json",
        settings_getter=lambda: SETTINGS,
        fetcher=watch_items,
        interval=180.0,
    )
except Exception:  # noqa: BLE001 提醒不可用不应影响主程序
    NOTIFY_HUB = None
LAST_PING = time.monotonic()
DESKTOP: Any = None


# ---------------- HTTP 服务 ----------------
class Handler(BaseHTTPRequestHandler):
    server_version = "BWMonitor/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:  # 静默访问日志
        return

    # ---- helpers ----
    def _send(self, code: int, body: bytes, ctype: str = "application/json; charset=utf-8") -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _json(self, payload: Any, code: int = 200) -> None:
        self._send(code, json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def _body(self) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0:
                return {}
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, OSError):
            return {}

    def _static(self, rel: str) -> None:
        path = (STATIC_DIR / rel).resolve()
        if not str(path).startswith(str(STATIC_DIR.resolve())) or not path.is_file():
            self._send(404, b"not found", "text/plain; charset=utf-8")
            return
        ctypes = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
        }
        self._send(200, path.read_bytes(), ctypes.get(path.suffix.lower(), "application/octet-stream"))

    # ---- routes ----
    def do_GET(self) -> None:  # noqa: N802
        global LAST_PING
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if route in ("/", "/index.html"):
            self._static("index.html")
            return

        LAST_PING = time.monotonic()

        if route == "/api/state":
            self._json(
                {
                    "serverTime": time.time(),
                    "tasks": MANAGER.snapshot(),
                    "settings": SETTINGS,
                    "all": {
                        "count": len(_ALL_STATE["projects"]),
                        "running": _ALL_STATE["running"],
                        "error": _ALL_STATE["error"],
                        "stamp": _ALL_STATE["stamp"],
                    },
                    "meta": {
                        "name": APP_NAME,
                        "version": APP_VERSION,
                        "author": APP_AUTHOR,
                        "contact": APP_CONTACT,
                        "repo": APP_REPO,
                        "github": APP_GITHUB,
                        "description": APP_DESCRIPTION,
                        "build": APP_BUILD,
                        "desktop": DESKTOP.status() if DESKTOP is not None else {"native": False},
                    },
                }
            )
            return

        if route == "/api/desktop":
            self._json(
                {
                    "ok": True,
                    "status": DESKTOP.status() if DESKTOP is not None else {"native": False},
                }
            )
            return

        if route == "/api/search":
            keyword = (query.get("q") or [""])[0].strip()
            if not keyword:
                self._json({"ok": True, "items": [], "pages": 1, "total": 0, "partial": False})
                return
            try:
                payload = search_pool(keyword)
            except Exception as exc:  # noqa: BLE001
                self._json({"ok": False, "error": f"{type(exc).__name__}: {exc}"})
                return
            self._json({"ok": True, **payload, "page": 1, "keyword": keyword})
            return

        if route == "/api/list":
            p_type = (query.get("type") or [""])[0]
            try:
                area = int((query.get("area") or ["0"])[0] or 0)
            except ValueError:
                area = 0
            try:
                payload = category_pool(p_type, area)
            except Exception as exc:  # noqa: BLE001
                self._json({"ok": False, "error": f"{type(exc).__name__}: {exc}"})
                return
            self._json({"ok": True, **payload, "page": 1, "type": p_type, "area": area})
            return

        if route == "/api/cities":
            try:
                cities = fetch_cities()
            except Exception as exc:  # noqa: BLE001
                self._json({"ok": False, "error": f"{type(exc).__name__}: {exc}", "items": []})
                return
            self._json({"ok": True, "items": cities})
            return

        if route == "/api/date":
            day = str((query.get("date") or [""])[0]).strip()[:10]
            if not valid_day(day):
                self._json({"ok": False, "error": "日期格式应为 YYYY-MM-DD", "items": []}, 400)
                return
            force = (query.get("refresh") or ["0"])[0] == "1"
            with _ALL_LOCK:
                pool = list(_ALL_STATE["projects"])
                running = bool(_ALL_STATE["running"])
                stamp = float(_ALL_STATE["stamp"] or 0)
            stale = force or not pool or time.monotonic() - stamp > core.Config.BROWSE_CACHE_SECONDS
            if stale and not running:
                threading.Thread(target=fetch_all, args=(True,), daemon=True).start()
                running = True
            items = filter_projects_by_date(pool, day)
            self._json(
                {
                    "ok": True,
                    "date": day,
                    "items": items,
                    "total": len(items),
                    "running": running,
                    "stale": stale,
                }
            )
            return

        if route == "/api/all":
            force = (query.get("refresh") or ["0"])[0] == "1"
            threading.Thread(target=fetch_all, args=(force,), daemon=True).start()
            with _ALL_LOCK:
                self._json(
                    {
                        "ok": True,
                        "items": list(_ALL_STATE["projects"]),
                        "running": _ALL_STATE["running"],
                        "stamp": _ALL_STATE["stamp"],
                        "progress": dict(_ALL_STATE.get("progress") or {}),
                    }
                )
            return

        if route == "/api/notifications":
            if NOTIFY_HUB is None:
                self._json({"ok": True, "items": [], "latest": 0, "enabled": {"new": False, "sale": False}})
                return
            try:
                after = int((query.get("after") or ["0"])[0] or 0)
            except ValueError:
                after = 0
            peek = (query.get("peek") or ["0"])[0] == "1"
            payload = NOTIFY_HUB.since(after, peek)
            self._json(
                {
                    "ok": True,
                    **payload,
                    "enabled": NOTIFY_HUB.enabled(),
                }
            )
            return

        if route == "/api/fonts":
            with _FONT_LOCK:
                fonts = [{k: v for k, v in item.items() if k != "file"} for item in CUSTOM_FONTS]
            self._json({"ok": True, "fonts": fonts})
            return

        if route.startswith("/api/fonts/"):
            font_id = urllib.parse.unquote(route[len("/api/fonts/"):]).strip()
            with _FONT_LOCK:
                item = next((f for f in CUSTOM_FONTS if f["id"] == font_id), None)
            if not item:
                self._send(404, b"font not found", "text/plain; charset=utf-8")
                return
            path = FONT_DIR / item["file"]
            try:
                body = path.read_bytes()
            except OSError:
                self._send(404, b"font not found", "text/plain; charset=utf-8")
                return
            self._send(200, body, FONT_MIME.get(item["ext"], "application/octet-stream"))
            return

        if route == "/api/ping":
            self._json(
                {
                    "ok": True,
                    "pid": os.getpid(),
                    "build": APP_BUILD,
                    "version": APP_VERSION,
                    "assets": ASSET_ID,
                }
            )
            return

        if route.startswith("/static/"):
            self._static(route[len("/static/"):])
            return

        self._send(404, b"not found", "text/plain; charset=utf-8")

    def do_POST(self) -> None:  # noqa: N802
        global SETTINGS
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path
        body = self._body()

        if route == "/api/desktop/show":
            if DESKTOP is not None:
                DESKTOP.show_window()
            self._json({"ok": True, "status": DESKTOP.status() if DESKTOP is not None else {"native": False}})
            return

        if route == "/api/notifications/test":
            if NOTIFY_HUB is not None:
                NOTIFY_HUB.push_sample(str(body.get("kind") or "new"))
            self._json({"ok": True})
            return

        if route == "/api/tasks":
            project_id = str(body.get("id") or "").strip()
            if not project_id:
                self._json({"ok": False, "error": "缺少票务 ID"}, 400)
                return
            snapshot = MANAGER.start(
                project_id,
                str(body.get("name") or ""),
                SETTINGS,
                str(body.get("city") or "").strip()[:20],
            )
            self._json({"ok": True, "task": snapshot})
            return

        if route == "/api/fonts":
            name = str(body.get("name") or "").strip()[:60]
            raw = str(body.get("data") or "")
            if raw.startswith("data:") and "," in raw:
                raw = raw.split(",", 1)[1]
            if not name or not raw:
                self._json({"ok": False, "error": "缺少字体名称或数据"}, 400)
                return
            try:
                data = base64.b64decode(raw, validate=True)
            except (binascii.Error, ValueError):
                self._json({"ok": False, "error": "字体数据不是合法的 base64"}, 400)
                return
            if not data or len(data) > 20 * 1024 * 1024:
                self._json({"ok": False, "error": "字体文件为空或超过 20 MB"}, 400)
                return
            signature = data[:4]
            if signature in (b"wOFF", b"wOF2"):
                ext = "woff" if signature == b"wOFF" else "woff2"
            elif signature == b"OTTO":
                ext = "otf"
            elif signature in (b"\x00\x01\x00\x00", b"true", b"ttcf"):
                ext = "ttf"
            else:
                self._json({"ok": False, "error": "不是可识别的 TTF / OTF / WOFF 字体"}, 400)
                return
            font_id = hashlib.sha1(data).hexdigest()[:16]
            try:
                FONT_DIR.mkdir(parents=True, exist_ok=True)
                (FONT_DIR / f"{font_id}.{ext}").write_bytes(data)
            except OSError as exc:
                self._json({"ok": False, "error": f"保存字体失败：{exc}"}, 500)
                return
            item = {
                "id": font_id,
                "name": name,
                "file": f"{font_id}.{ext}",
                "ext": ext,
                "size": len(data),
                "family": f"IQXFont_{font_id}",
            }
            with _FONT_LOCK:
                CUSTOM_FONTS[:] = [f for f in CUSTOM_FONTS if f["id"] != font_id] + [item]
                _save_custom_fonts(CUSTOM_FONTS)
            self._json({"ok": True, "font": {k: v for k, v in item.items() if k != "file"}})
            return

        if route == "/api/settings":
            for key in ("interval", "timeout"):
                if key in body:
                    try:
                        SETTINGS[key] = max(1.0, float(body[key]))
                    except (TypeError, ValueError):
                        pass
            if "log" in body:
                SETTINGS["log"] = bool(body["log"])
            if "theme" in body:
                SETTINGS["theme"] = str(body["theme"])
            if "language" in body:
                SETTINGS["language"] = str(body["language"])
            if "fps" in body:
                try:
                    SETTINGS["fps"] = max(30, min(600, int(body["fps"])))
                except (TypeError, ValueError):
                    pass
            if "fpsUnlimited" in body:
                SETTINGS["fpsUnlimited"] = bool(body["fpsUnlimited"])
            if "fpsMax" in body:
                try:
                    SETTINGS["fpsMax"] = max(30, min(600, int(body["fpsMax"])))
                except (TypeError, ValueError):
                    pass
            if "monet" in body:
                SETTINGS["monet"] = bool(body["monet"])
            if "monetSeed" in body:
                seed = str(body["monetSeed"]).strip()
                if len(seed) == 7 and seed.startswith("#"):
                    try:
                        int(seed[1:], 16)
                        SETTINGS["monetSeed"] = seed.lower()
                    except ValueError:
                        pass
            if "edgeColor" in body:
                edge = str(body["edgeColor"]).strip().lower()
                if edge == "rainbow":
                    SETTINGS["edgeColor"] = "rainbow"
                elif len(edge) == 7 and edge.startswith("#"):
                    try:
                        int(edge[1:], 16)
                        SETTINGS["edgeColor"] = edge
                    except ValueError:
                        pass
            if "fontFamily" in body:
                family = str(body["fontFamily"]).strip()
                if family in ("system", "yahei", "segoe", "serif", "mono") or (
                    family.startswith("custom:") and _safe_font_id(family[7:])
                ):
                    SETTINGS["fontFamily"] = family
            if "fontSize" in body:
                try:
                    SETTINGS["fontSize"] = max(12, min(20, int(float(body["fontSize"]))))
                except (TypeError, ValueError):
                    pass
            if "fontWeight" in body:
                try:
                    weight = int(body["fontWeight"])
                    if weight in (400, 500, 600):
                        SETTINGS["fontWeight"] = weight
                except (TypeError, ValueError):
                    pass
            for key in (
                "desktopMinimizeToTray",
                "desktopCloseToTray",
                "desktopHideTaskbar",
                "desktopHideFullscreen",
            ):
                if key in body:
                    SETTINGS[key] = bool(body[key])
            for key in ("notifyNew", "notifySale"):
                if key in body:
                    SETTINGS[key] = bool(body[key])
            if "notifyCity" in body:
                try:
                    SETTINGS["notifyCity"] = max(0, int(body["notifyCity"]))
                except (TypeError, ValueError):
                    pass
            if "notifyPos" in body:
                pos = str(body["notifyPos"]).strip().lower()
                if pos in ("br", "bl", "tr", "tl", "island"):
                    SETTINGS["notifyPos"] = pos
            if "notifyDuration" in body:
                try:
                    SETTINGS["notifyDuration"] = max(3000, min(15000, int(body["notifyDuration"])))
                except (TypeError, ValueError):
                    pass
            if "motion" in body:
                motion = str(body["motion"]).strip().lower()
                if motion in ("full", "soft", "lite", "off"):
                    SETTINGS["motion"] = motion
            save_settings(SETTINGS)
            self._json({"ok": True, "settings": SETTINGS})
            return

        self._send(404, b"not found", "text/plain; charset=utf-8")

    def do_DELETE(self) -> None:  # noqa: N802
        global SETTINGS
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/fonts/"):
            font_id = urllib.parse.unquote(parsed.path[len("/api/fonts/"):]).strip()
            removed = None
            with _FONT_LOCK:
                removed = next((f for f in CUSTOM_FONTS if f["id"] == font_id), None)
                if removed:
                    CUSTOM_FONTS[:] = [f for f in CUSTOM_FONTS if f["id"] != font_id]
                    _save_custom_fonts(CUSTOM_FONTS)
            if not removed:
                self._send(404, b"font not found", "text/plain; charset=utf-8")
                return
            try:
                (FONT_DIR / removed["file"]).unlink(missing_ok=True)
            except OSError:
                pass
            if SETTINGS.get("fontFamily") == f"custom:{font_id}":
                SETTINGS["fontFamily"] = "system"
                save_settings(SETTINGS)
            self._json({"ok": True, "fontFamily": SETTINGS.get("fontFamily", "system")})
            return
        if parsed.path.startswith("/api/tasks/"):
            project_id = urllib.parse.unquote(parsed.path[len("/api/tasks/"):])
            MANAGER.stop(project_id)
            self._json({"ok": True})
            return
        self._send(404, b"not found", "text/plain; charset=utf-8")


def pick_port() -> int:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def existing_instance() -> tuple[int, str, str, str] | None:
    """返回正在运行的实例 (端口, 构建号, 版本, 静态资源指纹)；没有就 None。"""
    try:
        info = json.loads(PORT_FILE.read_text(encoding="utf-8"))
        port = int(info["port"])
    except (OSError, ValueError, KeyError):
        return None
    import urllib.request

    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/ping", timeout=0.8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return (
            port,
            str(data.get("build") or ""),
            str(data.get("version") or ""),
            str(data.get("assets") or ""),
        )
    except Exception:  # noqa: BLE001 连不上就当作没有实例
        return None


def find_edge() -> str | None:
    candidates = [
        Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft/Edge/Application/msedge.exe",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return None


def open_window(url: str) -> None:
    edge = find_edge()
    if edge:
        profile = STATE_DIR / "edge-profile"
        subprocess.Popen(
            [
                edge,
                f"--app={url}",
                "--window-size=1220,800",
                f"--user-data-dir={profile}",
                "--no-first-run",
                "--no-default-browser-check",
            ],
            close_fds=True,
        )
        return
    if sys.platform == "win32":
        os.startfile(url)  # type: ignore[attr-defined]
    else:
        import webbrowser

        webbrowser.open(url)


def _start_desktop(url: str) -> None:
    """启动 Windows 原生窗口/托盘管理（不可用时保持 Edge 默认行为）。"""
    global DESKTOP
    if sys.platform != "win32":
        return
    try:
        from desktop_shell import DesktopShell

        def _quit_from_tray() -> None:
            MANAGER.stop_all()
            try:
                PORT_FILE.unlink()
            except OSError:
                pass
            os._exit(0)

        DESKTOP = DesktopShell(
            url=url,
            icon_path=BASE_DIR / "icon.ico",
            settings_getter=lambda: SETTINGS,
            reopen_window=lambda: open_window(url),
            quit_app=_quit_from_tray,
        )
        DESKTOP.start()
    except Exception:  # noqa: BLE001 桌面增强失败不应影响监测
        try:
            (STATE_DIR / "desktop.log").write_text(traceback.format_exc(), encoding="utf-8")
        except OSError:
            pass


def _launch_window(url: str) -> None:
    time.sleep(0.6)
    open_window(url)
    _start_desktop(url)


def main() -> int:
    if os.environ.get("BW_NO_WINDOW") == "1":  # 调试：只起服务，不开窗口
        if NOTIFY_HUB is not None:
            NOTIFY_HUB.start()
        port = pick_port()
        httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
        httpd.daemon_threads = True
        try:
            PORT_FILE.write_text(json.dumps({"port": port}), encoding="utf-8")
        except OSError:
            pass
        print(f"http://127.0.0.1:{port}/", flush=True)
        try:
            httpd.serve_forever(poll_interval=0.5)
        except KeyboardInterrupt:
            pass
        finally:
            MANAGER.stop_all()
            try:
                PORT_FILE.unlink()
            except OSError:
                pass
        return 0

    existing = existing_instance()
    if (
        existing
        and existing[1] == APP_BUILD
        and existing[2] == APP_VERSION
        and existing[3] == ASSET_ID
    ):
        # 构建号、版本号、界面内容都一致才复用，避免看到旧界面
        open_window(f"http://127.0.0.1:{existing[0]}/")
        return 0

    port = pick_port()
    try:
        PORT_FILE.write_text(json.dumps({"port": port}), encoding="utf-8")
    except OSError:
        pass

    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    httpd.daemon_threads = True
    if NOTIFY_HUB is not None:
        NOTIFY_HUB.start()
    url = f"http://127.0.0.1:{port}/"

    threading.Thread(target=_launch_window, args=(url,), daemon=True).start()
    threading.Thread(target=_watchdog, daemon=True).start()

    try:
        httpd.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        if DESKTOP is not None:
            DESKTOP.stop()
        MANAGER.stop_all()
        try:
            PORT_FILE.unlink()
        except OSError:
            pass
    return 0


def _watchdog() -> None:
    """前端关掉（不再轮询）后自动退出；托盘驻留时保持进程。"""
    while True:
        time.sleep(3)
        if time.monotonic() - LAST_PING > 40:
            if DESKTOP is not None and DESKTOP.keep_alive():
                continue
            MANAGER.stop_all()
            os._exit(0)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception:  # noqa: BLE001
        crash = STATE_DIR / "crash.log"
        try:
            crash.write_text(traceback.format_exc(), encoding="utf-8")
        except OSError:
            pass
        raise
