"""提醒中心：新活动 / 开票提醒的扫描、去重、队列与持久化。

设计要点：
  * 后台线程定时扫描「关注城市」的近期活动，首轮只建立基线，不会把旧活动当新活动弹出来；
  * 新项目 → new 提醒；项目开售时间从上一轮跨过当前时间 → sale 提醒；
  * 监控任务里票种变为「预售中」时，由 app.Task 直接调用 push_sale_task；
  * 队列带自增 id，前端用 after 游标增量拉取，10 分钟前的提醒不再回放；
  * 状态写 notify.json，重启后不会重复提醒。
"""

from __future__ import annotations

import json
import os
import random
import threading
import time
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

POSITIONS = ("br", "bl", "tr", "tl", "island")


class NotifyHub:
    def __init__(
        self,
        state_path: Path,
        settings_getter: Callable[[], dict[str, Any]],
        fetcher: Callable[[int], list[dict[str, Any]]] | None = None,
        interval: float = 180.0,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self.state_path = Path(state_path)
        self.settings_getter = settings_getter
        self.fetcher = fetcher
        self.interval = max(30.0, float(interval))
        self.clock = clock
        self.lock = threading.RLock()
        self.queue: deque[dict[str, Any]] = deque(maxlen=60)
        self.seq = 0
        self.seen: dict[str, float] = {}
        self.sale_sent: set[str] = set()
        self.baseline = False
        self.last_scan = 0.0
        self._dirty = False
        self._saved_at = 0.0
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._load()

    # ---------- 生命周期 ----------
    def start(self) -> None:
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._loop, daemon=True, name="notify-hub")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._save(force=True)

    def enabled(self) -> dict[str, bool]:
        s = self.settings_getter() or {}
        return {
            "new": bool(s.get("notifyNew", True)),
            "sale": bool(s.get("notifySale", True)),
        }

    # ---------- 持久化 ----------
    def _load(self) -> None:
        try:
            raw = json.loads(self.state_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return
        if not isinstance(raw, dict):
            return
        seen = raw.get("seen")
        if isinstance(seen, dict):
            for key, value in seen.items():
                try:
                    self.seen[str(key)] = float(value)
                except (TypeError, ValueError):
                    continue
        sale = raw.get("saleSent")
        if isinstance(sale, list):
            self.sale_sent = {str(x) for x in sale}
        self.baseline = bool(raw.get("baseline"))
        try:
            self.last_scan = float(raw.get("lastScan") or 0.0)
        except (TypeError, ValueError):
            self.last_scan = 0.0

    def _save(self, force: bool = False) -> None:
        now = time.monotonic()
        if not force and now - self._saved_at < 20:
            self._dirty = True
            return
        self._saved_at = now
        self._dirty = False
        cutoff = self.clock() - 45 * 86400
        if len(self.seen) > 4000:
            self.seen = {
                key: value
                for key, value in sorted(self.seen.items(), key=lambda kv: kv[1], reverse=True)[:4000]
            }
        else:
            self.seen = {key: value for key, value in self.seen.items() if value >= cutoff}
        payload = {
            "seen": self.seen,
            "saleSent": sorted(self.sale_sent)[-2000:],
            "baseline": self.baseline,
            "lastScan": self.last_scan,
        }
        try:
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.state_path.with_suffix(".tmp")
            tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp, self.state_path)
        except OSError:
            pass

    # ---------- 扫描 ----------
    def _loop(self) -> None:
        # 启动后先缓一下，别和界面启动抢请求
        if self._stop.wait(6.0):
            return
        while not self._stop.is_set():
            try:
                self.scan_once()
            except Exception:  # noqa: BLE001 提醒失败不能影响监测
                pass
            wait = self.interval * random.uniform(0.85, 1.15)
            if self._stop.wait(wait):
                return

    def scan_once(self) -> None:
        flags = self.enabled()
        if not (flags["new"] or flags["sale"]) or self.fetcher is None:
            return
        city = 0
        try:
            city = int((self.settings_getter() or {}).get("notifyCity", 0) or 0)
        except (TypeError, ValueError):
            city = 0
        items = self.fetcher(city)
        if not items:
            return
        now = self.clock()
        with self.lock:
            self._diff(items, now)
            self.last_scan = now
            self._save()

    def _diff(self, items: list[dict[str, Any]], now: float) -> None:
        flags = self.enabled()
        today = datetime.now().strftime("%Y-%m-%d")
        if not self.baseline:
            for item in items:
                pid = str(item.get("id") or "")
                if pid:
                    self.seen.setdefault(pid, now)
            self.baseline = True
            self.last_scan = now
            self._save(force=True)
            return

        # 重新打开程序后间隙太大，不补发「开票」，只记录
        gap_ok = self.last_scan and (now - self.last_scan) <= 900
        new_items: list[dict[str, Any]] = []
        sale_items: list[dict[str, Any]] = []
        for item in items:
            pid = str(item.get("id") or "").strip()
            if not pid:
                continue
            end = str(item.get("endDate") or item.get("date") or "")[:10]
            if end and end < today:
                continue
            first_seen = self.seen.get(pid)
            if first_seen is None:
                self.seen[pid] = now
                if flags["new"]:
                    new_items.append(item)
                continue
            if not flags["sale"] or pid in self.sale_sent:
                continue
            try:
                sale_start = int(item.get("saleStart") or 0)
            except (TypeError, ValueError):
                sale_start = 0
            if sale_start and gap_ok and self.last_scan < sale_start <= now:
                self.sale_sent.add(pid)
                sale_items.append(item)

        for item in new_items:
            self.push_new(item)
        for item in sale_items:
            self.push_sale(item)

    # ---------- 推送 ----------
    def _enqueue(self, payload: dict[str, Any]) -> None:
        with self.lock:
            self.seq += 1
            payload["id"] = self.seq
            payload["at"] = self.clock()
            self.queue.append(payload)

    def push_new(self, item: dict[str, Any]) -> None:
        self._enqueue(
            {
                "kind": "new",
                "title": str(item.get("name") or ""),
                "city": str(item.get("city") or ""),
                "date": str(item.get("date") or ""),
                "price": str(item.get("price") or ""),
                "saleAt": str(item.get("saleAt") or ""),
                "projectId": str(item.get("id") or ""),
                "ticket": "",
                "category": str(item.get("category") or ""),
                "url": str(item.get("url") or ""),
            }
        )

    def push_sale(self, item: dict[str, Any]) -> None:
        self._enqueue(
            {
                "kind": "sale",
                "title": str(item.get("name") or ""),
                "city": str(item.get("city") or ""),
                "date": str(item.get("date") or ""),
                "price": str(item.get("price") or ""),
                "saleAt": str(item.get("saleAt") or ""),
                "projectId": str(item.get("id") or ""),
                "ticket": "",
                "category": str(item.get("category") or ""),
                "url": str(item.get("url") or ""),
            }
        )

    def push_sale_task(
        self,
        project_id: str,
        name: str,
        city: str,
        url: str,
        ticket: str,
        price: str = "",
    ) -> None:
        self._enqueue(
            {
                "kind": "sale",
                "title": str(name or ""),
                "city": str(city or ""),
                "date": "",
                "price": str(price or ""),
                "saleAt": "",
                "projectId": str(project_id or ""),
                "ticket": str(ticket or ""),
                "category": "",
                "url": str(url or ""),
            }
        )

    def push_sample(self, kind: str = "new") -> None:
        item = {
            "kind": "new" if kind != "sale" else "sale",
            "title": "示例展会 · 城市漫展 ONLY 特别场",
            "city": "上海",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "price": "￥68起",
            "saleAt": datetime.now().strftime("%m-%d %H:%M"),
            "projectId": "1006893",
            "ticket": "预售票" if kind == "sale" else "",
            "category": "展览",
            "url": "https://show.bilibili.com/platform/detail.html?id=1006893",
        }
        self._enqueue(item)

    # ---------- 读取 ----------
    def since(self, after: int = 0, peek: bool = False) -> dict[str, Any]:
        now = self.clock()
        with self.lock:
            latest = self.seq
            if peek:
                return {"items": [], "latest": latest}
            items = [
                dict(item)
                for item in self.queue
                if int(item.get("id", 0)) > after and now - float(item.get("at", 0)) <= 900
            ]
        return {"items": items, "latest": latest}
