"""Bili_Ticket_Monitor by TaiMiao & AI

本版本在上游 1.1.4.5 的基础上增加了「按关键词查询票务 ID」功能：
启动时可以先搜展会名，查到 ID 后直接开始监控，不用再去网页地址栏里找。
"""

from __future__ import annotations

import argparse
import logging
import os
import random
import re
import shutil
import sys
import threading
import time
import traceback
from dataclasses import dataclass
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Sequence
from urllib.parse import quote

try:
    import msvcrt  # Windows 控制台按键检测（监控中按 S 换展会）
except ImportError:  # 在非 Windows 上跑源码时降级为不支持快捷键
    msvcrt = None


def _pause(message: str = "按回车键退出程序...") -> None:
    """双击启动时窗口会随进程一起消失，出错后停一下，别让人只看到闪一下。"""
    try:
        if sys.stdin is not None and sys.stdin.isatty():
            input(f"\n{message}\n")
    except (EOFError, KeyboardInterrupt):
        pass


def _write_crash_log(detail: str) -> str:
    path = Path(os.environ.get("TEMP") or Path.home()) / "bili_ticket_monitor_crash.log"
    try:
        path.write_text(
            f"{datetime.now():%Y-%m-%d %H:%M:%S}\n{detail}\n",
            encoding="utf-8",
            errors="replace",
        )
        return str(path)
    except OSError:
        return ""


try:
    import requests
    from colorama import Fore, Style, init
    from urllib3 import disable_warnings
    from urllib3.exceptions import InsecureRequestWarning
    from urllib3.util.retry import Retry
    from wcwidth import wcswidth
except ImportError as exc:  # 换机器 / 换了 Python 时最常见的「双击闪退」原因
    print(f"[错误] 缺少依赖：{exc}")
    print(f"[错误] 当前解释器：{sys.executable}")
    print("请在该解释器下执行：pip install -r requirements.txt")
    _write_crash_log(f"ImportError: {exc}\n解释器: {sys.executable}\n")
    _pause()
    raise SystemExit(1) from exc

# 版本号与 metadata.yaml / exe 保持一致
__version__ = "1.1.8.0"

disable_warnings(InsecureRequestWarning)
init(autoreset=True)


# ---------------- 配置 ----------------
class Config:
    """默认配置。打包前通常只需要改 TICKET_ID / ENABLE_LOG。"""

    TICKET_ID = "1001653"  # 默认票务 ID（BW2026）；启动时会提示先搜索
    API_URL = (
        "https://show.bilibili.com/api/ticket/project/getV2"
        "?version=134&id={ticket_id}"
    )
    # 会员购搜索接口：按关键词查展会，返回结果里带票务 ID
    SEARCH_API_URL = (
        "https://show.bilibili.com/api/ticket/search/list"
        "?version=134&platform=web&keyword={keyword}&page={page}&pagesize={pagesize}"
    )
    SEARCH_PAGE_SIZE = 10  # 搜索结果条数

    REFRESH_INTERVAL = 2.0  # 轮询间隔（秒），实际间隔会叠加 ±JITTER_RATIO 抖动
    JITTER_RATIO = 0.3  # 抖动比例，0 表示固定间隔
    TIMEOUT = 10.0  # 单次请求超时（秒）

    ENABLE_LOG = False  # 日志开关
    LOG_FILE = "monitor.log"  # 日志文件（相对启动目录）
    LOG_MAX_BYTES = 5 * 1024 * 1024  # 单个日志文件上限
    LOG_BACKUP_COUNT = 3  # 轮转保留份数

    CONFIRM_UPDATES = 2  # 连续 N 次轮询一致，才确认为「状态变化」
    CONFIRM_REMOVALS = 2  # 连续 N 次轮询缺失，才确认为「移除」
    MAX_BACKOFF = 60.0  # 出错退避上限（秒）

    # 「全国展会」浏览：搜索接口只能按关键词查，这里用一批覆盖面广的词各翻几页再合并去重
    BROWSE_CORE_KEYWORDS = ("漫展", "动漫", "演出", "比赛", "展览", "演唱会", "同人")
    BROWSE_EXTRA_KEYWORDS = (
        "音乐会", "话剧", "舞台剧", "音乐剧", "赛事",
        "电竞", "音乐节", "嘉年华", "ONLY", "签售", "见面会", "游戏",
    )
    BROWSE_CORE_PAGES = 3  # 核心词翻 3 页（每页 20 条）
    BROWSE_EXTRA_PAGES = 2  # 长尾词翻 2 页
    BROWSE_REQUEST_GAP = 0.05  # 相邻请求间隔（秒），太快容易触发风控
    BROWSE_PAGE_SIZE = 15  # 浏览界面每屏显示多少条
    BROWSE_CACHE_SECONDS = 180  # 全国列表缓存多久，重复按 A 不用重新拉

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
        "Referer": "https://show.bilibili.com/",
    }


class StatusColor:
    COLOR_MAP = {
        "已售罄": Fore.RED,
        "已停售": Fore.RED,
        "不可售": Fore.RED,
        "未开售": Fore.RED,
        "暂时售罄": Fore.YELLOW,
        "预售中": Fore.GREEN,
    }
    DEFAULT = Fore.WHITE


# ---------------- 文本/宽度工具 ----------------
_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def text_width(text: str) -> int:
    """按终端显示宽度计算（中文 = 2 列，ANSI 转义不占位）。"""
    plain = _ANSI_RE.sub("", text)
    width = wcswidth(plain)
    return width if width >= 0 else len(plain)


def pad(text: str, width: int, align: str = "left") -> str:
    fill = " " * max(0, width - text_width(text))
    return text + fill if align == "left" else fill + text


def fit(text: str, width: int) -> str:
    """按显示宽度截断，超长以省略号结尾；着色文本会保留转义并在末尾复位。"""
    if width <= 0:
        return ""
    if text_width(text) <= width:
        return text

    limit = width - 1
    kept: list[str] = []
    used = 0
    index = 0
    while index < len(text) and used < limit:
        match = _ANSI_RE.match(text, index)
        if match:  # 转义序列原样保留，不占显示宽度
            kept.append(match.group())
            index = match.end()
            continue
        char_width = wcswidth(text[index])
        char_width = char_width if char_width >= 0 else 1
        if used + char_width > limit:
            break
        kept.append(text[index])
        used += char_width
        index += 1
    kept.append("…")
    if _ANSI_RE.search(text):
        kept.append(Style.RESET_ALL)
    return "".join(kept)


def format_duration(seconds: float) -> str:
    seconds = int(seconds)
    return f"{seconds // 3600:02d}:{seconds % 3600 // 60:02d}:{seconds % 60:02d}"


# ---------------- 数据模型 ----------------
@dataclass(frozen=True)
class Ticket:
    screen: str
    desc: str
    status: str
    ticket_id: int = 0  # 票种 ID，用于拼购票链接
    price: int = 0  # 单价，单位：分
    free: bool = False
    sale_start: int = 0  # 开售时间（epoch 秒）

    @property
    def name(self) -> str:
        return f"{self.screen} {self.desc}".strip()

    @property
    def key(self) -> tuple[str, str]:
        return (self.screen, self.desc)

    @property
    def price_text(self) -> str:
        if self.free:
            return "免费"
        if self.price <= 0:
            return "-"
        yuan = self.price / 100
        return f"￥{yuan:.2f}".rstrip("0").rstrip(".") if yuan % 1 else f"￥{int(yuan)}"


@dataclass(frozen=True)
class Change:
    kind: str  # 新增 / 状态变化 / 移除
    screen: str
    desc: str
    old: str
    new: str

    @property
    def name(self) -> str:
        return f"{self.screen} {self.desc}".strip()


@dataclass(frozen=True)
class Project:
    """搜索结果里的一个展会/演出项目。"""

    project_id: str
    name: str
    city: str
    date: str
    sale_at: str
    price: str
    status: str


def describe_change(change: Change) -> str:
    if change.kind == "新增":
        return f"新增票种: {change.name} -> {change.new}"
    if change.kind == "移除":
        return f"移除票种: {change.name} (原状态 {change.old})"
    return f"状态变化: {change.name} 从 {change.old} 变为 {change.new}"


class ApiError(RuntimeError):
    """接口返回了非预期的内容。"""


_SPACE_RE = re.compile(r"[ \t\u00a0\u3000]+")


def clean_text(value: object, *, limit: int = 120) -> str:
    """把接口里的字符串收拾干净：全角/不换行空格归一，连续空白压成一个。"""
    text = _SPACE_RE.sub(" ", str(value if value is not None else "")).strip()
    return text[:limit]


def _int_or_zero(value: object) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0


def _epoch_seconds(value: object) -> int:
    """把 unix 秒或 "2026-10-01 00:00:00" 统一成 epoch 秒；解析不了返回 0。"""
    if isinstance(value, (int, float)):
        return int(value) if value > 0 else 0
    text = str(value or "").strip()
    if not text:
        return 0
    if text.isdigit():
        return int(text)
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return int(datetime.strptime(text, fmt).timestamp())
        except ValueError:
            continue
    return 0


_WARM_LOCK = threading.Lock()


def _warm_session(session: requests.Session) -> None:
    """搜索接口对没有 buvid 的会话会返回 81102084，先访问一次主站拿 cookie。"""
    if getattr(session, "_iqx_warm", False):
        return
    with _WARM_LOCK:
        if getattr(session, "_iqx_warm", False):
            return
        try:
            if not session.cookies.get("buvid3"):
                session.get(
                    "https://www.bilibili.com/",
                    headers=Config.HEADERS,
                    timeout=min(float(Config.TIMEOUT), 8.0),
                )
        except Exception:  # noqa: BLE001 预热失败也让正式请求照常尝试
            pass
        setattr(session, "_iqx_warm", True)


def _ticket_status(item: dict) -> str:
    """sale_flag 绝大多数时候是 {"display_name": ...}，少数项目会直接给字符串。"""
    flag = item.get("sale_flag")
    if isinstance(flag, dict):
        status = clean_text(flag.get("display_name"), limit=32)
    elif isinstance(flag, str):
        status = clean_text(flag, limit=32)
    else:
        status = ""
    return status or "未知"


def parse_tickets(payload: object) -> tuple[str, list[Ticket]]:
    """把接口 JSON 摊平成 Ticket 列表；场次名参与命名，避免重名票种互相覆盖。"""
    if not isinstance(payload, dict):
        raise ApiError("接口返回的不是 JSON 对象")

    code = payload.get("code")
    if payload.get("success") is False or code not in (0, None):
        raise ApiError(f"接口返回错误 code={code} message={payload.get('message')}")

    data = payload.get("data") or {}
    if not isinstance(data, dict):
        raise ApiError("接口 data 字段格式异常")

    name = clean_text(data.get("name"), limit=80) or "未知项目"
    tickets: list[Ticket] = []
    seen: set[tuple[str, str]] = set()

    screens = data.get("screen_list")
    if isinstance(screens, list):
        for screen in screens:
            if not isinstance(screen, dict):
                continue
            screen_name = clean_text(screen.get("name") or screen.get("screen_name"))
            items = screen.get("ticket_list")
            if isinstance(items, list):
                for item in items:
                    _add_ticket(tickets, seen, screen_name, item)

    # 真实数据挂在 screen_list 下，ticket_list 恒为空；换版本时也可能直接用这一层。
    items = data.get("ticket_list")
    if isinstance(items, list):
        for item in items:
            _add_ticket(tickets, seen, "", item)

    return name, tickets


def _add_ticket(
    tickets: list[Ticket], seen: set[tuple[str, str]], screen_name: str, item: object
) -> None:
    if not isinstance(item, dict):
        return
    desc = clean_text(item.get("desc") or item.get("name"))
    if not desc:
        return
    ticket = Ticket(
        screen_name,
        desc,
        _ticket_status(item),
        ticket_id=_int_or_zero(item.get("id")),
        price=_int_or_zero(item.get("price")),
        free=bool(item.get("is_free")),
        sale_start=_epoch_seconds(item.get("saleStart") or item.get("sale_start")),
    )
    if ticket.key in seen:  # 同场次同名的重复行会让去抖计数混乱，只留第一条
        return
    seen.add(ticket.key)
    tickets.append(ticket)


# ---------------- 搜索票务 ID ----------------
def _price_text(item: dict) -> str:
    low = item.get("price_low")
    high = item.get("price_high")
    if item.get("is_free"):
        return "免费"
    try:
        low_value = float(low) / 100
    except (TypeError, ValueError):
        return "-"
    if not low_value:
        return "-"
    # 用全角「￥」：U+00A5 在 GBK 控制台里编码不了，会让整行输出被截断重写
    return f"￥{low_value:g}起" if high and high != low else f"￥{low_value:g}"


def _date_text(item: dict) -> str:
    start = clean_text(item.get("start_time"), limit=32)
    if start[:10]:
        return start[:10]
    return "-"


def _sale_text(item: dict) -> str:
    """开售时间：接口给的是 unix 秒，转成本地时间显示。"""
    for key in ("sale_start_time", "sale_start"):
        value = item.get(key)
        try:
            stamp = int(value)
        except (TypeError, ValueError):
            continue
        if stamp > 0:
            return datetime.fromtimestamp(stamp).strftime("%m-%d %H:%M")
    return "-"


def parse_search(payload: object) -> list[Project]:
    """解析会员购搜索接口，返回带票务 ID 的项目列表。"""
    if not isinstance(payload, dict):
        raise ApiError("搜索接口返回的不是 JSON 对象")
    code = payload.get("code", payload.get("errno"))
    if code not in (0, None):
        raise ApiError(f"搜索接口返回错误 code={code} message={payload.get('message')}")

    data = payload.get("data") or {}
    if not isinstance(data, dict):
        raise ApiError("搜索接口 data 字段格式异常")

    results = data.get("result")
    if not isinstance(results, list):
        raise ApiError("搜索接口没有返回结果列表")

    projects: list[Project] = []
    for item in results:
        if not isinstance(item, dict):
            continue
        project_id = clean_text(item.get("id") or item.get("ticket_id"), limit=20)
        name = clean_text(item.get("project_name") or item.get("title"), limit=60)
        if not project_id or not name:
            continue
        projects.append(
            Project(
                project_id=project_id,
                name=name,
                city=clean_text(item.get("city"), limit=12),
                date=_date_text(item),
                sale_at=_sale_text(item),
                price=_price_text(item),
                status=clean_text(item.get("sale_flag"), limit=8),
            )
        )
    # 新展会排前面，免得用户在一堆老活动里翻半天
    projects.sort(key=lambda p: (p.date == "-", p.date), reverse=True)
    return projects


def search_projects_page(
    session: requests.Session,
    keyword: str,
    timeout: float,
    page_size: int = 10,
    page: int = 1,
) -> tuple[list[Project], int, bool]:
    """搜索一页，返回 (项目列表, total 累计值, 是否末页)。

    搜索接口的 total 是「累计已返回条数」，不是总条数；末页只能看 isLastBrush
    或本页条数是否小于 page_size。
    """
    _warm_session(session)
    url = Config.SEARCH_API_URL.format(
        keyword=quote(keyword, safe=""), page=max(1, page), pagesize=max(1, page_size)
    )
    response = session.get(url, headers=Config.HEADERS, timeout=timeout)
    response.raise_for_status()
    try:
        payload = response.json()
    except ValueError as exc:
        raise ApiError(f"搜索响应不是合法 JSON（HTTP {response.status_code}）") from exc
    projects = parse_search(payload)
    data = payload.get("data") if isinstance(payload, dict) else {}
    data = data if isinstance(data, dict) else {}
    try:
        total = int(data.get("total") or 0)
    except (TypeError, ValueError):
        total = 0
    last = bool(data.get("isLastBrush")) or len(projects) < max(1, page_size)
    return projects, total, last


def search_projects(
    session: requests.Session,
    keyword: str,
    timeout: float,
    page_size: int = 10,
    page: int = 1,
) -> list[Project]:
    return search_projects_page(session, keyword, timeout, page_size, page)[0]


def project_columns() -> int:
    return max(60, shutil.get_terminal_size((100, 24)).columns)


def render_projects(
    projects: Sequence[Project], columns: int, start_index: int = 1
) -> list[str]:
    """把搜索结果排成对齐的中文表格。"""
    if not projects:
        return [f"{Fore.YELLOW}没有搜到相关展会，换个关键词再试试{Style.RESET_ALL}"]

    show_sale = columns >= 108  # 窗口够宽才显示开售时间，免得把名称列挤没
    last_index = start_index + len(projects) - 1
    index_w = max(text_width("序号"), len(str(last_index)))
    id_w = max(7, max(text_width("票务ID"), *(text_width(p.project_id) for p in projects)))
    city_w = min(10, max(4, max(text_width("城市"), *(text_width(p.city) for p in projects))))
    date_w = 10
    sale_w = max(11, max(text_width(p.sale_at) for p in projects)) if show_sale else 0
    price_w = max(6, max(text_width("票价"), *(text_width(p.price) for p in projects)))
    status_w = max(4, max(text_width("状态"), *(text_width(p.status) for p in projects)))
    column_count = 7 if show_sale else 6
    fixed = index_w + id_w + city_w + date_w + sale_w + price_w + status_w + column_count * 2
    name_w = max(16, min(40, columns - fixed))

    header = "  ".join(
        [
            pad("序号", index_w),
            pad("票务ID", id_w),
            pad("名称", name_w),
            pad("城市", city_w),
            pad("开展日期", date_w),
            *([pad("开售时间", sale_w)] if show_sale else []),
            pad("票价", price_w),
            pad("状态", status_w),
        ]
    )
    lines = [
        f"{Fore.CYAN}{header}{Style.RESET_ALL}",
        "-" * min(columns - 1, text_width(header)),
    ]
    for index, project in enumerate(projects, start_index):
        color = StatusColor.COLOR_MAP.get(project.status, StatusColor.DEFAULT)
        cells = [
            f"{Fore.CYAN}{pad(str(index), index_w)}{Style.RESET_ALL}",
            pad(project.project_id, id_w),
            pad(fit(project.name, name_w), name_w),
            pad(fit(project.city, city_w), city_w),
            pad(project.date, date_w),
        ]
        if show_sale:
            cells.append(pad(project.sale_at, sale_w))
        cells.append(pad(project.price, price_w, "right"))
        cells.append(f"{color}{pad(project.status, status_w)}{Style.RESET_ALL}")
        lines.append("  ".join(cells))
    return lines


_ID_IN_URL_RE = re.compile(r"[?&]id=(\d{1,20})")
_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


# ---------------- 全国展会浏览 ----------------
_ALL_CACHE: dict[str, object] = {"stamp": 0.0, "projects": []}


def _progress(text: str) -> None:
    """拉取列表时的单行进度提示（只在真控制台里显示）。"""
    if not (sys.stdout and sys.stdout.isatty()):
        return
    sys.stdout.write("\r" + text + "  ")
    sys.stdout.flush()


def _progress_done() -> None:
    if not (sys.stdout and sys.stdout.isatty()):
        return
    sys.stdout.write("\r" + " " * 60 + "\r")
    sys.stdout.flush()


def fetch_all_projects(
    session: requests.Session, timeout: float, *, use_cache: bool = True
) -> list[Project]:
    """拉全国展会：多个大类关键词各翻几页，按票务 ID 合并去重。

    搜索接口只能按关键词查，「全部」只能用覆盖面广的词拼出来；
    结果按开展日期倒序，缓存几分钟，重复按 A 不用重新拉。
    """
    now = time.monotonic()
    cached = _ALL_CACHE.get("projects") or []
    if use_cache and cached and now - float(_ALL_CACHE.get("stamp") or 0) < Config.BROWSE_CACHE_SECONDS:
        return list(cached)  # type: ignore[arg-type]

    keywords = [(kw, Config.BROWSE_CORE_PAGES) for kw in Config.BROWSE_CORE_KEYWORDS]
    keywords += [(kw, Config.BROWSE_EXTRA_PAGES) for kw in Config.BROWSE_EXTRA_KEYWORDS]
    total_steps = sum(pages for _, pages in keywords)
    merged: dict[str, Project] = {}
    step = 0
    aborted = False

    for keyword, pages in keywords:
        for page in range(1, max(1, pages) + 1):
            step += 1
            _progress(f"正在拉取全国展会 {step}/{total_steps}：{keyword} 第 {page} 页")
            try:
                for project in search_projects(session, keyword, timeout, 20, page=page):
                    merged.setdefault(project.project_id, project)
            except requests.HTTPError as exc:
                status = exc.response.status_code if exc.response is not None else 0
                if status == 412:  # 触发风控就先收手，别把号搭进去
                    aborted = True
                    break
            except (requests.RequestException, ApiError):
                pass  # 单个关键词失败不影响整体
            time.sleep(Config.BROWSE_REQUEST_GAP)
        if aborted:
            break

    _progress_done()
    projects = sorted(merged.values(), key=lambda p: (p.date == "-", p.date), reverse=True)
    if projects:
        _ALL_CACHE["stamp"] = time.monotonic()
        _ALL_CACHE["projects"] = projects
    return projects


def browse_projects(
    session: requests.Session, timeout: float, projects: Sequence[Project] | None = None
) -> str:
    """全国展会分页浏览：选序号返回票务 ID，回车返回空字符串。"""
    if projects is None:
        _print(sys.stdout, "")
        _print(sys.stdout, f"{Fore.CYAN}正在拉取全国展会列表，第一次需要几秒钟…{Style.RESET_ALL}")
        projects = fetch_all_projects(session, timeout)

    items = list(projects)
    while True:
        if not items:
            _print(sys.stdout, f"{Fore.YELLOW}没拉到展会数据，稍后再试{Style.RESET_ALL}")
            return ""

        total = len(items)
        page_size = max(5, Config.BROWSE_PAGE_SIZE)
        pages = max(1, -(-total // page_size))
        page = 0

        while True:
            start = page * page_size
            chunk = items[start:start + page_size]
            _print(sys.stdout, "")
            _print(
                sys.stdout,
                f"{Style.BRIGHT}{Fore.CYAN}===== 全国展会 ====={Style.RESET_ALL}"
                f"  共 {total} 条，第 {page + 1}/{pages} 页",
            )
            for line in render_projects(chunk, project_columns(), start_index=start + 1):
                _print(sys.stdout, line)

            raw = _ask(
                "输入序号选择（N=下一页 P=上一页 F=搜关键词 回车=返回）："
            )
            if not raw:
                return ""
            key = raw.lower()
            if key == "n":
                if page + 1 < pages:
                    page += 1
                else:
                    _print(sys.stdout, f"{Fore.YELLOW}已经是最后一页{Style.RESET_ALL}")
                continue
            if key == "p":
                if page > 0:
                    page -= 1
                else:
                    _print(sys.stdout, f"{Fore.YELLOW}已经是第一页{Style.RESET_ALL}")
                continue
            if key == "f":
                keyword = _ask("请输入关键词：")
                if not keyword:
                    continue
                found = _search_or_none(session, keyword, timeout, 20)
                if found is None:
                    continue
                items = list(found)
                break  # 回到外层，用新结果重新分页

            if raw.isdigit():
                index = int(raw)
                if 1 <= index <= total:
                    chosen = items[index - 1]
                    _print(
                        sys.stdout,
                        f"{Fore.GREEN}已选择：{chosen.name}（票务 ID {chosen.project_id}）"
                        f"{Style.RESET_ALL}",
                    )
                    return chosen.project_id
                _print(sys.stdout, f"{Fore.YELLOW}序号超出范围，请输入 1-{total}{Style.RESET_ALL}")
                continue

            project_id = extract_project_id(raw)
            if project_id and len(project_id) >= 4:
                return _confirm_project(session, project_id, timeout)
            _print(sys.stdout, f"{Fore.YELLOW}看不懂这个输入，请输入序号{Style.RESET_ALL}")


def extract_project_id(raw: str) -> str:
    """从用户输入里取出票务 ID：支持纯数字、带 id= 的网址、整条详情页链接。"""
    text = raw.strip()
    if not text:
        return ""
    match = _ID_IN_URL_RE.search(text)
    if match:
        return match.group(1)
    if text.isdigit():
        return text
    if _URL_RE.match(text):
        tail = re.search(r"(\d{3,})", text.rsplit("id=", 1)[-1]) if "id=" in text else None
        if tail:
            return tail.group(1)
    return ""


def describe_project(session: requests.Session, ticket_id: str, timeout: float) -> str:
    """查一次详情接口，确认 ID 有效并拿到项目名。"""
    try:
        response = session.get(
            Config.API_URL.format(ticket_id=ticket_id),
            headers=Config.HEADERS,
            timeout=timeout,
        )
        response.raise_for_status()
        name, _ = parse_tickets(response.json())
        return name
    except Exception:  # 查不到就返回空，不阻塞主流程
        return ""


def _print(stream, text: str = "") -> None:
    encoding = getattr(stream, "encoding", None) or "utf-8"
    try:
        stream.write(text + "\n")
    except UnicodeEncodeError:
        stream.write(text.encode(encoding, "replace").decode(encoding, "replace") + "\n")
    stream.flush()


def _confirm_project(
    session: requests.Session, project_id: str, timeout: float
) -> str:
    """回查一次详情，把项目名显示给用户；查不到也照常返回 ID。"""
    name = describe_project(session, project_id, timeout)
    if name:
        _print(
            sys.stdout,
            f"{Fore.GREEN}已选择：{name}（票务 ID {project_id}）{Style.RESET_ALL}",
        )
    else:
        _print(
            sys.stdout,
            f"{Fore.YELLOW}提示：票务 ID {project_id} 没查到详情，仍按这个 ID 监控"
            f"{Style.RESET_ALL}",
        )
    return project_id


def _ask(prompt: str) -> str:
    """input 的薄封装：EOF / Ctrl+C 一律当作空输入处理。"""
    try:
        return input(prompt).strip()
    except (EOFError, KeyboardInterrupt):
        _print(sys.stdout, "")
        return ""


def _search_or_none(
    session: requests.Session,
    keyword: str,
    timeout: float,
    page_size: int,
    page: int = 1,
):
    """搜索并打印错误；失败返回 None，和「搜到 0 条」区分开。"""
    try:
        return search_projects(session, keyword, timeout, page_size, page=page)
    except requests.RequestException as exc:
        _print(sys.stdout, f"{Fore.RED}[错误] 搜索请求失败：{exc}{Style.RESET_ALL}")
    except ApiError as exc:
        _print(sys.stdout, f"{Fore.RED}[错误] {exc}{Style.RESET_ALL}")
    return None


def prompt_for_project(
    session: requests.Session, default_id: str, timeout: float, page_size: int
) -> str:
    """交互式查询票务 ID：输入关键词 → 列出结果 → 选择 → 返回 ID。

    选号界面输入 R 可以换个关键词接着搜，不用重开程序；
    任何一步直接回车都表示放弃，返回默认 ID。
    """
    _print(sys.stdout, "")
    _print(
        sys.stdout,
        f"{Style.BRIGHT}{Fore.CYAN}===== 票务 ID 查询 ====={Style.RESET_ALL}"
        f"  直接回车 = 使用默认 ID {default_id}",
    )
    keyword = _ask("请输入展会/演出关键词（A=浏览全国全部，例如 BW2026、BML、CP31）：")

    page_no = 1
    while True:
        if not keyword:
            return default_id
        if keyword.lower() in ("a", "all", "全部", "全国"):
            chosen_id = browse_projects(session, timeout)
            if chosen_id:
                return chosen_id
            keyword = _ask("请输入展会/演出关键词（A=浏览全国全部）：")
            continue

        projects = _search_or_none(session, keyword, timeout, page_size, page=page_no)
        if projects is None:  # 搜索本身出错，别把用户困在循环里
            return default_id
        if projects:
            _print(
                sys.stdout,
                f"{Fore.CYAN}关键词「{keyword}」 第 {page_no} 页{Style.RESET_ALL}",
            )
            for line in render_projects(projects, project_columns()):
                _print(sys.stdout, line)

        while True:
            hint = (
                "输入序号选择（N/P=翻页，R=换关键词，A=全国全部，回车取消）："
                if projects
                else "没搜到，R=换关键词，A=全国全部，回车取消："
            )
            raw = _ask(hint)
            if not raw:
                return default_id
            key = raw.lower()
            if key == "r":
                keyword = _ask("请输入新的关键词：")
                page_no = 1
                break
            if key in ("a", "all", "全部", "全国"):
                chosen_id = browse_projects(session, timeout)
                if chosen_id:
                    return chosen_id
                break
            if key == "n":
                page_no += 1
                break
            if key == "p":
                page_no = max(1, page_no - 1)
                break

            # 纯小数字先当序号，其余按「ID / 链接」解析
            if raw.isdigit() and len(raw) <= 2:
                index = int(raw)
                if 1 <= index <= len(projects):
                    chosen = projects[index - 1]
                    _print(
                        sys.stdout,
                        f"{Fore.GREEN}已选择：{chosen.name}（票务 ID {chosen.project_id}）"
                        f"{Style.RESET_ALL}",
                    )
                    return chosen.project_id
                _print(
                    sys.stdout,
                    f"{Fore.YELLOW}序号超出范围，请输入 1-{len(projects)}{Style.RESET_ALL}",
                )
                continue

            project_id = extract_project_id(raw)
            if project_id and len(project_id) >= 4:
                return _confirm_project(session, project_id, timeout)
            _print(sys.stdout, f"{Fore.YELLOW}看不懂这个输入，请输入序号或数字 ID{Style.RESET_ALL}")


class TicketBoard:
    """维护「已确认的票种状态」，把服务级抖动过滤掉。"""

    def __init__(self, confirm_updates: int = 2, confirm_removals: int = 2) -> None:
        self.confirm_updates = max(1, confirm_updates)
        self.confirm_removals = max(1, confirm_removals)
        self._confirmed: dict[tuple[str, str], Ticket] = {}
        self._pending: dict[tuple[str, str], tuple[str, int]] = {}
        self._missing: dict[tuple[str, str], int] = {}
        self.ready = False

    @property
    def pending(self) -> int:
        return len(self._pending) + len(self._missing)

    def seed(self, tickets: Sequence[Ticket]) -> None:
        self._confirmed = {ticket.key: ticket for ticket in tickets}
        self._pending.clear()
        self._missing.clear()
        self.ready = True

    def update(self, tickets: Sequence[Ticket]) -> list[Change]:
        """喂入一次观测结果，返回本次「确认成立」的变动。"""
        current = {ticket.key: ticket for ticket in tickets}
        if not self.ready:
            self.seed(tickets)
            return []

        changes: list[Change] = []
        for key, ticket in current.items():
            known = self._confirmed.get(key)
            if known is None:
                if self._confirm(key, ticket.status):
                    self._confirmed[key] = ticket
                    changes.append(Change("新增", ticket.screen, ticket.desc, "", ticket.status))
            elif known.status != ticket.status:
                if self._confirm(key, ticket.status):
                    self._confirmed[key] = ticket
                    changes.append(
                        Change("状态变化", ticket.screen, ticket.desc, known.status, ticket.status)
                    )
            else:
                self._pending.pop(key, None)

        for key, known in list(self._confirmed.items()):
            if key in current:
                self._missing.pop(key, None)
                continue
            count = self._missing.get(key, 0) + 1
            if count >= self.confirm_removals:
                self._missing.pop(key, None)
                self._pending.pop(key, None)
                del self._confirmed[key]
                changes.append(Change("移除", known.screen, known.desc, known.status, ""))
            else:
                self._missing[key] = count

        return changes

    def _confirm(self, key: tuple[str, str], status: str) -> bool:
        pending = self._pending.get(key)
        count = pending[1] + 1 if pending and pending[0] == status else 1
        if count >= self.confirm_updates:
            self._pending.pop(key, None)
            return True
        self._pending[key] = (status, count)
        return False


# ---------------- 终端输出 ----------------
class Console:
    """线程安全输出；支持 ANSI 时整块就地重绘，避免刷屏。"""

    def __init__(self, *, redraw: bool = True, stream=None) -> None:
        self.stream = stream or sys.stdout
        self.lock = threading.RLock()
        self._block_height = 0
        self._line_width = 0
        self._inplace = redraw and self._is_tty()

    def _is_tty(self) -> bool:
        try:
            return bool(self.stream.isatty())
        except (AttributeError, ValueError):
            return False

    def write(self, text: str) -> None:
        with self.lock:
            self.stream.write(self._encode_safe(text))
            self.stream.flush()

    def _encode_safe(self, text: str) -> str:
        """控制台编码可能不是 UTF-8（例如 GBK），保证不会因个别字符崩掉。"""
        encoding = getattr(self.stream, "encoding", None)
        if not encoding:
            return text
        try:
            text.encode(encoding)
        except (LookupError, UnicodeEncodeError):
            return text.encode(encoding, "replace").decode(encoding, "replace")
        return text

    def clear(self) -> None:
        with self.lock:
            if self._inplace:
                self.stream.write("\033[2J\033[H")
            self._block_height = 0
            self.stream.flush()

    @property
    def inplace(self) -> bool:
        """是否会用 ANSI 就地重绘（非 tty 或 --no-redraw 时为 False）。"""
        return self._inplace

    @staticmethod
    def _height(block: Sequence[str]) -> int:
        columns = max(20, shutil.get_terminal_size((100, 24)).columns)
        # 长行会被终端折行，占用的「实际行数」必须计入光标上移量
        return sum(max(1, -(-text_width(line) // columns)) for line in block)

    def fits(self, lines: Sequence[str]) -> bool:
        """整块能否安全地就地覆盖（不会顶进滚动区）。"""
        return self._inplace and not self._too_tall(self._height(lines))

    def render(self, lines: Sequence[str]) -> None:
        block = list(lines)
        with self.lock:
            height = self._height(block)
            # 下面若停着未换行的状态行，回表体首行要多上移一行
            open_line = self._line_width > 0
            up = self._block_height + (1 if open_line else 0)
            tail_width = self._line_width
            self._line_width = 0

            if not self._inplace or self._too_tall(height):
                # 内容高于窗口时无法安全地向上覆盖，退化为顺序输出
                self._block_height = 0
                self.stream.write(self._encode_safe("\n".join(block) + "\n"))
                self.stream.flush()
                return

            buffer = [f"\033[{up}A"] if up else []
            for line in block:
                buffer.append("\033[2K" + line + "\n")
            # 擦掉上一帧多出来的行，再把光标提回块底，否则每次重绘都会往下漂
            pad = max(0, self._block_height - height)
            for _ in range(pad):
                buffer.append("\033[2K\n")
            if pad:
                buffer.append(f"\033[{pad}A")
            self.stream.write(self._encode_safe("".join(buffer)))
            self.stream.flush()
            self._block_height = height
            # 记下尾巴宽度，交给 update_line 用空格擦
            self._line_width = tail_width if open_line else 0

    def update_line(self, text: str) -> None:
        """原地刷新同一行（表格比窗口高时，用它代替每轮打印整表）。"""
        width = text_width(text)
        with self.lock:
            if not self._inplace:
                self.stream.write(self._encode_safe(text) + "\n")
                self.stream.flush()
                return
            head = "\r" if self._line_width else ""
            tail = " " * max(0, self._line_width - width)  # 空格擦掉上一行残留
            self.stream.write(head + self._encode_safe(text) + tail)
            self.stream.flush()
            self._line_width = width

    def end_line(self) -> None:
        """结束原地刷新的那一行，让后续输出从新行开始。"""
        with self.lock:
            if self._line_width:
                self.stream.write("\n")
                self.stream.flush()
                self._line_width = 0

    @staticmethod
    def _too_tall(height: int) -> bool:
        terminal_lines = shutil.get_terminal_size((100, 24)).lines
        # 整块离窗口底边太近时，下一帧的光标上移会因滚动而错位
        return height + 2 > max(8, terminal_lines)


# ---------------- 键盘快捷键 ----------------
class KeyWatcher:
    """监控运行时在后台轮询按键：S=换展会，Q=退出。

    只在真正的控制台里启用（stdin 是 tty），重定向输入时自动关闭，
    免得把管道里的内容当按键吃掉。
    """

    def __init__(self, handler) -> None:
        self.handler = handler
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.enabled = msvcrt is not None and bool(sys.stdin and sys.stdin.isatty())

    def start(self) -> bool:
        if not self.enabled:
            return False
        self._thread = threading.Thread(target=self._loop, daemon=True, name="key-watcher")
        self._thread.start()
        return True

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                if msvcrt.kbhit():
                    key = msvcrt.getwch()
                    if key in ("\x00", "\xe0"):  # 方向键/F1 之类的双字节键，吃掉第二个字节
                        msvcrt.getwch()
                        continue
                    self.handler(key)
            except Exception:  # noqa: BLE001 键盘读失败不该拖垮监控
                return
            self._stop.wait(0.05)

    def stop(self) -> None:
        self._stop.set()
        thread = self._thread
        if thread is not None and thread.is_alive():
            thread.join(timeout=0.5)


# ---------------- 日志 ----------------
def setup_logging(settings: "Settings") -> logging.Logger:
    logger = logging.getLogger("bili_ticket_monitor")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    logger.handlers.clear()
    if not settings.log_enabled:
        logger.addHandler(logging.NullHandler())
        return logger

    handler = RotatingFileHandler(
        settings.log_file,
        maxBytes=Config.LOG_MAX_BYTES,
        backupCount=Config.LOG_BACKUP_COUNT,
        encoding="utf-8",
    )
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    logger.addHandler(handler)
    return logger


# ---------------- 运行参数 ----------------
@dataclass(frozen=True)
class Settings:
    ticket_id: str
    api_url: str
    interval: float
    timeout: float
    log_enabled: bool
    log_file: str
    redraw: bool
    max_polls: int

    @classmethod
    def from_args(cls, args: argparse.Namespace, ticket_id: str) -> "Settings":
        api_url = args.api_url or Config.API_URL.format(ticket_id=ticket_id)
        return cls(
            ticket_id=str(ticket_id),
            api_url=api_url,
            interval=max(0.1, float(args.interval)),
            timeout=max(1.0, float(args.timeout)),
            log_enabled=bool(args.log),
            log_file=str(args.log_file),
            redraw=not args.no_redraw,
            max_polls=max(0, int(args.max_polls)),
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog=Path(sys.argv[0]).stem if sys.argv and sys.argv[0] else "bili_ticket_monitor",
        description="B站会员购余票监测（终端版）",
    )
    parser.add_argument("--ticket-id", default=None, help="票务 ID（不给则启动时提示搜索）")
    parser.add_argument("-s", "--search", default=None, metavar="关键词",
                        help="按关键词搜索票务 ID，打印结果后退出")
    parser.add_argument("-a", "--all", action="store_true",
                        help="列出全国展会（漫展/演出/比赛等），打印后退出")
    parser.add_argument("--page-size", type=int, default=Config.SEARCH_PAGE_SIZE,
                        help="搜索结果条数，默认 %(default)s")
    parser.add_argument("--no-prompt", action="store_true",
                        help="跳过启动时的票务 ID 搜索提示，直接用默认 ID")
    parser.add_argument("--prompt", action="store_true",
                        help="强制在启动时进入票务 ID 查询（重定向输入时也能用）")
    parser.add_argument(
        "--interval",
        type=float,
        default=Config.REFRESH_INTERVAL,
        help="轮询间隔（秒），默认 %(default)s",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=Config.TIMEOUT,
        help="单次请求超时（秒），默认 %(default)s",
    )
    parser.add_argument(
        "--log",
        action=argparse.BooleanOptionalAction,
        default=Config.ENABLE_LOG,
        help="启用/禁用日志",
    )
    parser.add_argument("--log-file", default=Config.LOG_FILE, help="日志文件路径")
    parser.add_argument("--api-url", default=None, help="覆盖接口地址（调试用）")
    parser.add_argument("--max-polls", type=int, default=0, help="轮询 N 次后退出（0=无限，调试用）")
    parser.add_argument("--no-redraw", action="store_true", help="禁用就地刷新（便于重定向输出）")
    return parser


# ---------------- 监控主体 ----------------
class Monitor:
    def __init__(
        self,
        settings: Settings,
        console: Console,
        logger: logging.Logger,
        keys_hint: bool = False,
    ) -> None:
        self.settings = settings
        self.console = console
        self.logger = logger
        self.keys_hint = keys_hint

        self.stop = threading.Event()
        self.switch = False  # 按 S/A 时要换展会，而不是直接退出
        self.switch_all = False  # 换展会时直接进「全国展会」浏览
        self.fatal = False
        self.board = TicketBoard(Config.CONFIRM_UPDATES, Config.CONFIRM_REMOVALS)

        self.started = time.monotonic()
        self.polls = 0
        self.failures = 0
        self.error_count = 0
        self.last_error = ""
        self.warning = ""
        self.event_name = "正在获取票务信息…"
        self.tickets: list[Ticket] = []
        self._last_frame_key: tuple[object, ...] | None = None

    @staticmethod
    def _build_session() -> requests.Session:
        session = requests.Session()
        session.verify = False
        retry = Retry(
            total=2,
            connect=2,
            read=2,
            status=2,
            backoff_factor=0.5,
            status_forcelist=(500, 502, 503, 504),
            allowed_methods=frozenset({"GET"}),
            raise_on_status=False,
        )
        adapter = requests.adapters.HTTPAdapter(max_retries=retry)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session

    def _fetch(self, session: requests.Session) -> object:
        response = session.get(
            self.settings.api_url,
            headers=Config.HEADERS,
            timeout=self.settings.timeout,
        )
        response.raise_for_status()
        try:
            return response.json()
        except ValueError as exc:
            raise ApiError(f"响应不是合法 JSON（HTTP {response.status_code}）") from exc

    def run(self) -> None:
        session = self._build_session()
        self.logger.info(f"[Ticket {self.settings.ticket_id}] 程序启动")
        try:
            while not self.stop.is_set():
                self.polls += 1
                self._poll(session)
                self._render()
                if self.stop.is_set():
                    break
                if self.settings.max_polls and self.polls >= self.settings.max_polls:
                    break
                if self.stop.wait(self._delay()):
                    break
        finally:
            self.console.end_line()
            session.close()

    def _poll(self, session: requests.Session) -> None:
        try:
            payload = self._fetch(session)
            name, tickets = parse_tickets(payload)
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else 0
            if status == 412:
                self._fail("触发风控！立即停止！", fatal=True)
            elif status == 429:
                # 429 只是被限流，忽略即可：不计错误、不写日志、不退避，下一轮照常请求
                pass
            else:
                self._fail(f"HTTP错误 {status}")
        except requests.Timeout:
            self._fail("请求超时")
        except requests.RequestException as exc:
            self._fail(f"请求异常: {exc}")
        except ApiError as exc:
            self._fail(str(exc))
        except Exception as exc:  # 兜底：任何意外都不让监控线程退出
            self._fail(f"未预期的异常: {type(exc).__name__}: {exc}")
        else:
            self._accept(name, tickets)

    def _accept(self, name: str, tickets: list[Ticket]) -> None:
        self.failures = 0
        self.last_error = ""
        self.event_name = name

        if not tickets:
            # 空列表可能只是接口暂时没返回，不据此判定「移除」，也不重置状态
            self.warning = "接口未返回票种列表"
            self.tickets = []
            return

        self.warning = ""
        self.tickets = tickets
        if not self.board.ready:
            self.board.seed(tickets)
            self.logger.info(
                f"[Ticket {self.settings.ticket_id}] 监控启动，当前共 {len(tickets)} 个票种"
            )
            return

        for change in self.board.update(tickets):
            self.logger.info(f"[Ticket {self.settings.ticket_id}] {describe_change(change)}")

    def _fail(self, message: str, *, fatal: bool = False) -> None:
        self.error_count += 1
        self.failures += 1
        self.last_error = message
        self.logger.error(f"[Ticket {self.settings.ticket_id}] {message}")
        if fatal:
            self.fatal = True
            self.stop.set()

    def _delay(self) -> float:
        if self.failures:
            base = max(self.settings.interval, 1.0)
            delay = min(Config.MAX_BACKOFF, base * (2 ** min(self.failures - 1, 5)))
            return delay
        low = 1.0 - Config.JITTER_RATIO
        high = 1.0 + Config.JITTER_RATIO
        return self.settings.interval * random.uniform(low, high)

    def _render(self) -> None:
        columns = max(40, shutil.get_terminal_size((100, 24)).columns)
        log_state = "开" if self.settings.log_enabled else "关"
        hotkey = " | 按 S 换展会 · A 全国展会" if self.keys_hint else ""

        frame = [
            fit(
                f"{Style.BRIGHT}{Fore.CYAN}Bili_Ticket_Monitor"
                f"{Style.RESET_ALL}{Fore.CYAN} | 监控ID {self.settings.ticket_id}"
                f" | 刷新 {self.settings.interval:g}s | 日志 {log_state}{hotkey}"
                f"{Style.RESET_ALL}",
                columns - 1,
            ),
            "",
            fit(f"{Style.BRIGHT}{self.event_name}{Style.RESET_ALL}", columns - 1),
            *self._table(columns),
        ]

        if self.warning:
            frame.append("")
            frame.append(f"{Fore.YELLOW}[提示] {fit(self.warning, columns - 8)}{Style.RESET_ALL}")
        if self.last_error:
            frame.append("")
            frame.append(f"{Fore.RED}[错误] {fit(self.last_error, columns - 8)}{Style.RESET_ALL}")

        # 状态行单独拿出来：窗口放不下整表时，它是唯一会被原地刷新的那一行
        status = fit(self._status_line(), columns - 1)
        frame.append("")  # 表体与状态行之间留一个空行
        whole = frame + [status]

        if self.console.fits(whole):
            self.console.render(whole)
            self._last_frame_key = None
            return

        # 整表放不下：表体只在内容变化时重印，状态行固定在下面原地刷新
        key = self._frame_key()
        if key != self._last_frame_key:
            self.console.render(frame)
            self._last_frame_key = key
        self.console.update_line(status)

    def _frame_key(self) -> tuple[object, ...]:
        """整表内容快照，用来判断这一轮要不要重绘。"""
        return (
            self.event_name,
            tuple((ticket.key, ticket.status) for ticket in self.tickets),
            self.warning,
            self.last_error,
            self.fatal,
            self.failures,
        )

    def _status_line(self) -> str:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if self.fatal:
            health = f"{Fore.RED}已停止（风控）{Style.RESET_ALL}"
        elif self.failures:
            health = f"{Fore.YELLOW}重连中（第 {self.failures} 次）{Style.RESET_ALL}"
        else:
            health = f"{Fore.GREEN}正常{Style.RESET_ALL}"

        parts = [
            f"当前时间 {now}",
            f"运行 {format_duration(time.monotonic() - self.started)}",
            f"请求 {self.polls} 次",
            f"错误 {self.error_count} 次",
            f"状态 {health}",
        ]
        if self.board.pending:
            parts.append(f"{Fore.YELLOW}待确认 {self.board.pending}{Style.RESET_ALL}")
        return " | ".join(parts)

    def _table(self, columns: int) -> list[str]:
        tickets = self.tickets
        if not tickets:
            return [f"{Fore.YELLOW}（暂无票种数据）{Style.RESET_ALL}"]

        header = "票种"
        width_status = max([text_width("状态")] + [text_width(t.status) for t in tickets])
        width_name = max([text_width(header)] + [text_width(t.name) for t in tickets])
        # 票种列最多占到「终端宽度 - 状态列 - 间距」，避免折行
        width_name = max(16, min(width_name, max(16, columns - width_status - 3)))

        lines = [
            f"{Fore.CYAN}{pad(header, width_name)}  {pad('状态', width_status, 'right')}"
            f"{Style.RESET_ALL}",
            "-" * min(columns - 1, width_name + 2 + width_status),
        ]
        for ticket in tickets:
            color = StatusColor.COLOR_MAP.get(ticket.status, StatusColor.DEFAULT)
            lines.append(
                f"{pad(fit(ticket.name, width_name), width_name)}  "
                f"{color}{pad(ticket.status, width_status, 'right')}{Style.RESET_ALL}"
            )
        return lines


# ---------------- 入口 ----------------
def _print_projects(projects: Sequence[Project]) -> None:
    for line in render_projects(projects, project_columns()):
        _print(sys.stdout, line)


def _on_hotkey(key: str, monitor: Monitor) -> None:
    """监控中的快捷键：S = 换展会（回到查询），A = 浏览全国展会，Q = 退出。"""
    if key in ("s", "S"):
        monitor.switch = True
        monitor.switch_all = False
        monitor.stop.set()
    elif key in ("a", "A"):
        monitor.switch = True
        monitor.switch_all = True
        monitor.stop.set()
    elif key in ("q", "Q"):
        monitor.stop.set()


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    timeout = max(1.0, float(args.timeout))

    # GBK 控制台遇到编不出的字符会写到一半抛异常，导致整行重复；先兜住
    try:
        sys.stdout.reconfigure(errors="replace")
    except (AttributeError, ValueError):
        pass

    # 单独的「查 ID」模式：BW2026.exe --search BW2026
    if args.search:
        session = Monitor._build_session()
        try:
            projects = search_projects(session, args.search, timeout, args.page_size)
        except (requests.RequestException, ApiError) as exc:
            _print(sys.stdout, f"{Fore.RED}[错误] 搜索失败：{exc}{Style.RESET_ALL}")
            return 1
        finally:
            session.close()
        _print(sys.stdout, f"关键词：{args.search}")
        _print_projects(projects)
        return 0

    # 单独的「全国展会」模式：BW2026.exe --all
    if args.all:
        session = Monitor._build_session()
        try:
            projects = fetch_all_projects(session, timeout)
        finally:
            session.close()
        if not projects:
            _print(sys.stdout, f"{Fore.RED}[错误] 没拉到展会数据，稍后再试{Style.RESET_ALL}")
            return 1
        _print(sys.stdout, f"全国展会 共 {len(projects)} 条（按开展日期倒序）")
        for line in render_projects(projects, project_columns()):
            _print(sys.stdout, line)
        return 0

    ticket_id = (args.ticket_id or "").strip()
    interactive = bool(sys.stdin and sys.stdin.isatty()) or args.prompt
    session = Monitor._build_session()
    exit_code = 0

    try:
        # 没指定 ID 且是交互式运行：给一次搜索机会，找不到就用默认 ID
        if not ticket_id and interactive and not args.no_prompt:
            ticket_id = prompt_for_project(session, Config.TICKET_ID, timeout, args.page_size)
        ticket_id = ticket_id or Config.TICKET_ID

        while True:
            settings = Settings.from_args(args, ticket_id)
            logger = setup_logging(settings)
            console = Console(redraw=settings.redraw)
            monitor = Monitor(settings, console, logger)

            watcher = KeyWatcher(lambda key, m=monitor: _on_hotkey(key, m))
            monitor.keys_hint = watcher.start()

            console.clear()
            console.write(
                f"{Fore.CYAN}项目github页面：https://github.com/TaiMiao/Bili_Ticket_Monitor"
                f"{Style.RESET_ALL}\n"
            )

            crashed = False
            try:
                monitor.run()
            except KeyboardInterrupt:
                monitor.stop.set()
                console.write("\n")
            except Exception:  # 双击运行时至少要留下原因，而不是窗口一闪就没了
                detail = traceback.format_exc()
                crashed = True
                console.write(f"\n{Fore.RED}[错误] 程序异常退出：{Style.RESET_ALL}\n{detail}")
                crash_file = _write_crash_log(detail)
                if crash_file:
                    console.write(f"\n错误详情已保存到 {crash_file}\n")
            finally:
                watcher.stop()

            if monitor.fatal:
                console.write(
                    f"{Fore.RED}程序已因风控停止，请稍后更换网络环境再试。{Style.RESET_ALL}\n"
                )
            if crashed:
                exit_code = 1
                break
            if not monitor.switch:
                exit_code = 1 if monitor.fatal else 0
                break

            # 按了 S / A：回到查询界面（或直接进全国浏览），换一个展会继续，不用关窗口
            if monitor.switch_all:
                console.write(
                    f"\n{Fore.CYAN}===== 全国展会：选一个开始监控 ====={Style.RESET_ALL}\n"
                )
                new_id = browse_projects(session, timeout)
            else:
                console.write(
                    f"\n{Fore.CYAN}===== 换展会：重新查询票务 ID ====={Style.RESET_ALL}\n"
                )
                new_id = prompt_for_project(session, ticket_id, timeout, args.page_size)
            if not new_id:
                break
            ticket_id = new_id
    finally:
        session.close()

    _pause()
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
