"""Windows desktop-window helpers for the Edge app window.

The UI itself stays in Edge.  This module owns the small amount of native
behaviour that a browser page cannot provide:

* keep the process alive in the notification area (tray)
* hide the Edge window when it is minimised (minimise to tray)
* keep the app in the tray when the Edge window is closed, and reopen it
  from the tray (close to tray)
* hide the window from the taskbar / Alt+Tab
* remove the maximise button from the native title bar

All operations are best effort.  If Windows or Edge refuses a request, the
monitor keeps running normally.
"""

from __future__ import annotations

import ctypes
import os
import sys
import threading
import time
import urllib.parse
from ctypes import wintypes
from pathlib import Path
from typing import Any, Callable

try:
    import pystray
    from PIL import Image, ImageDraw

    _HAS_TRAY = True
except Exception:  # pragma: no cover - optional desktop integration
    pystray = None  # type: ignore[assignment]
    Image = None  # type: ignore[assignment]
    ImageDraw = None  # type: ignore[assignment]
    _HAS_TRAY = False


_IS_WINDOWS = sys.platform == "win32"
if _IS_WINDOWS:
    _user32 = ctypes.WinDLL("user32", use_last_error=True)
    _dwmapi = ctypes.WinDLL("dwmapi")
else:  # pragma: no cover
    _user32 = None
    _dwmapi = None


GWL_STYLE = -16
GWL_EXSTYLE = -20
WS_MAXIMIZEBOX = 0x00010000
WS_EX_TOOLWINDOW = 0x00000080
WS_EX_APPWINDOW = 0x00040000
SW_HIDE = 0
SW_SHOW = 5
SW_RESTORE = 9
SW_MINIMIZE = 6
SWP_NOSIZE = 0x0001
SWP_NOMOVE = 0x0002
SWP_NOZORDER = 0x0004
SWP_NOACTIVATE = 0x0010
SWP_FRAMECHANGED = 0x0020
DWMWA_EXTENDED_FRAME_BOUNDS = 9


class _RECT(ctypes.Structure):
    _fields_ = [
        ("left", wintypes.LONG),
        ("top", wintypes.LONG),
        ("right", wintypes.LONG),
        ("bottom", wintypes.LONG),
    ]


def _is_edge_window(hwnd: int) -> bool:
    """Only attach to the Edge app window, never to a browser tab."""
    if not _IS_WINDOWS:
        return False
    try:
        pid = wintypes.DWORD()
        _user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if not pid.value:
            return False
        _kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        _kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        _kernel32.OpenProcess.restype = wintypes.HANDLE
        _kernel32.QueryFullProcessImageNameW.argtypes = [
            wintypes.HANDLE,
            wintypes.DWORD,
            wintypes.LPWSTR,
            ctypes.POINTER(wintypes.DWORD),
        ]
        _kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
        process = _kernel32.OpenProcess(0x1000, False, pid.value)
        if not process:
            return False
        try:
            size = wintypes.DWORD(1024)
            path_buf = ctypes.create_unicode_buffer(size.value)
            if not _kernel32.QueryFullProcessImageNameW(
                process, 0, path_buf, ctypes.byref(size)
            ):
                return False
            return Path(path_buf.value).name.lower() == "msedge.exe"
        finally:
            _kernel32.CloseHandle(process)
    except Exception:
        return False


if _IS_WINDOWS:
    _WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    _user32.EnumWindows.argtypes = [_WNDENUMPROC, wintypes.LPARAM]
    _user32.EnumWindows.restype = wintypes.BOOL
    _user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
    _user32.GetWindowTextLengthW.restype = ctypes.c_int
    _user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    _user32.GetClassNameW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    _user32.GetWindowThreadProcessId.argtypes = [
        wintypes.HWND,
        ctypes.POINTER(wintypes.DWORD),
    ]
    _user32.GetWindowThreadProcessId.restype = wintypes.DWORD
    _user32.IsWindow.argtypes = [wintypes.HWND]
    _user32.IsWindow.restype = wintypes.BOOL
    _user32.IsWindowVisible.argtypes = [wintypes.HWND]
    _user32.IsWindowVisible.restype = wintypes.BOOL
    _user32.IsIconic.argtypes = [wintypes.HWND]
    _user32.IsIconic.restype = wintypes.BOOL
    _user32.IsZoomed.argtypes = [wintypes.HWND]
    _user32.IsZoomed.restype = wintypes.BOOL
    _user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
    _user32.ShowWindow.restype = wintypes.BOOL
    _user32.PostMessageW.argtypes = [
        wintypes.HWND,
        wintypes.UINT,
        wintypes.WPARAM,
        wintypes.LPARAM,
    ]
    _user32.PostMessageW.restype = wintypes.BOOL
    _user32.SetForegroundWindow.argtypes = [wintypes.HWND]
    _user32.SetForegroundWindow.restype = wintypes.BOOL
    _user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(_RECT)]
    _user32.GetWindowRect.restype = wintypes.BOOL
    _user32.GetWindowLongPtrW.argtypes = [wintypes.HWND, ctypes.c_int]
    _user32.GetWindowLongPtrW.restype = ctypes.c_ssize_t
    _user32.SetWindowLongPtrW.argtypes = [wintypes.HWND, ctypes.c_int, ctypes.c_ssize_t]
    _user32.SetWindowLongPtrW.restype = ctypes.c_ssize_t
    _user32.SetWindowPos.argtypes = [
        wintypes.HWND,
        wintypes.HWND,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_uint,
    ]
    _user32.SetWindowPos.restype = wintypes.BOOL
    _user32.GetDpiForWindow.argtypes = [wintypes.HWND]
    _user32.GetDpiForWindow.restype = wintypes.UINT
    _dwmapi.DwmGetWindowAttribute.argtypes = [
        wintypes.HWND,
        wintypes.DWORD,
        ctypes.c_void_p,
        wintypes.DWORD,
    ]
    _dwmapi.DwmGetWindowAttribute.restype = ctypes.c_long


class DesktopShell:
    """Manage the native Edge app window and its notification-area icon."""

    def __init__(
        self,
        url: str,
        icon_path: str | os.PathLike[str],
        settings_getter: Callable[[], dict[str, Any]],
        reopen_window: Callable[[], None],
        quit_app: Callable[[], None],
    ) -> None:
        self.url = url
        self.port = urllib.parse.urlparse(url).port or 0
        self.icon_path = Path(icon_path)
        self.settings_getter = settings_getter
        self.reopen_window = reopen_window
        self.quit_app = quit_app

        self.hwnd: int | None = None
        self.hidden = False
        self.hidden_reason = ""
        self.awaiting_window = False
        self._had_window = False
        self._last_reopen = 0.0
        self._base_style: int | None = None
        self._base_exstyle: int | None = None
        self._applied_style: tuple[int, int] | None = None
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._tray_icon: Any = None
        self._tray_thread: threading.Thread | None = None
        self._tray_visible = False
        self._tray_error = ""

    # ------------------------------------------------------------------
    # lifecycle
    # ------------------------------------------------------------------
    def start(self) -> None:
        if not _IS_WINDOWS:
            return
        threading.Thread(target=self._poll_loop, daemon=True, name="iqx-desktop").start()

    def stop(self) -> None:
        self._stop.set()
        if self._tray_icon is not None:
            try:
                self._tray_icon.visible = False
                self._tray_icon.stop()
            except Exception:
                pass
            self._tray_icon = None

    def keep_alive(self) -> bool:
        """A stale frontend heartbeat must not kill a tray-resident app."""
        return bool(self.hidden)

    def status(self) -> dict[str, Any]:
        return {
            "native": bool(self.hwnd and _IS_WINDOWS and _user32.IsWindow(self.hwnd)),
            "hwnd": int(self.hwnd) if self.hwnd else 0,
            "hidden": bool(self.hidden),
            "reason": self.hidden_reason,
            "tray": bool(self._tray_visible),
            "tray_error": self._tray_error,
        }

    # ------------------------------------------------------------------
    # public actions (also used by the tray menu)
    # ------------------------------------------------------------------
    def show_window(self) -> None:
        if self.hwnd and _IS_WINDOWS and _user32.IsWindow(self.hwnd):
            if _user32.IsIconic(self.hwnd):
                _user32.ShowWindow(self.hwnd, SW_RESTORE)
            _user32.ShowWindow(self.hwnd, SW_SHOW)
            try:
                _user32.SetForegroundWindow(self.hwnd)
            except Exception:
                pass
            self.hidden = False
            self.hidden_reason = ""
            self.awaiting_window = False
            return

        now = time.monotonic()
        if now - self._last_reopen < 4.0:
            return
        self._last_reopen = now
        self.awaiting_window = True
        self.hidden = True
        self.hidden_reason = "close"
        try:
            self.reopen_window()
        except Exception:
            pass

    def hide_window(self) -> None:
        if self.hwnd and _IS_WINDOWS and _user32.IsWindow(self.hwnd):
            _user32.ShowWindow(self.hwnd, SW_HIDE)
        self.hidden = True
        self.hidden_reason = "tray"
        self._ensure_tray(True)

    def quit(self) -> None:
        # Close the Edge window first so quitting from the tray leaves no
        # hidden browser window behind.  os._exit follows immediately.
        try:
            if self.hwnd and _IS_WINDOWS and _user32.IsWindow(self.hwnd):
                _user32.PostMessageW(self.hwnd, 0x0010, 0, 0)  # WM_CLOSE
                time.sleep(0.25)
        except Exception:
            pass
        try:
            self.quit_app()
        except Exception:
            os._exit(0)

    # ------------------------------------------------------------------
    # native window
    # ------------------------------------------------------------------
    def _poll_loop(self) -> None:
        while not self._stop.wait(0.35):
            try:
                settings = self.settings_getter()
                self._ensure_window()
                settings_tray = bool(
                    settings.get("desktopMinimizeToTray", False)
                    or settings.get("desktopCloseToTray", False)
                    or settings.get("desktopHideTaskbar", False)
                )
                if settings_tray or self.hidden:
                    self._ensure_tray(True)

                if self.hwnd and _user32.IsWindow(self.hwnd):
                    self._apply_styles(settings)
                    if (
                        _HAS_TRAY
                        and (
                            settings.get("desktopMinimizeToTray", False)
                            or settings.get("desktopHideTaskbar", False)
                        )
                        and _user32.IsIconic(self.hwnd)
                        and not self.hidden
                    ):
                        _user32.ShowWindow(self.hwnd, SW_HIDE)
                        self.hidden = True
                        self.hidden_reason = "minimize"
                elif self._had_window and not self.awaiting_window:
                    if settings.get("desktopCloseToTray", False) and not self.hidden:
                        self.hidden = True
                        self.hidden_reason = "close"
                    self.hwnd = None
                    self._base_style = None
                    self._base_exstyle = None
                    self._applied_style = None

                need_tray = bool(
                    self.hidden
                    or settings.get("desktopMinimizeToTray", False)
                    or settings.get("desktopCloseToTray", False)
                    or settings.get("desktopHideTaskbar", False)
                )
                self._ensure_tray(need_tray)
            except Exception:
                # Native integration must never take the monitor down.
                continue

    def _ensure_window(self) -> None:
        if self.hwnd and _user32.IsWindow(self.hwnd):
            if self.awaiting_window:
                self.awaiting_window = False
                self.hidden = False
                self.hidden_reason = ""
                _user32.ShowWindow(self.hwnd, SW_SHOW)
                _user32.SetForegroundWindow(self.hwnd)
            return

        found = self._find_window()
        if not found:
            return

        self.hwnd = found
        self._had_window = True
        self._base_style = int(_user32.GetWindowLongPtrW(found, GWL_STYLE))
        self._base_exstyle = int(_user32.GetWindowLongPtrW(found, GWL_EXSTYLE))
        self._applied_style = (self._base_style, self._base_exstyle)
        if self.awaiting_window:
            self.awaiting_window = False
            self.hidden = False
            self.hidden_reason = ""
            _user32.ShowWindow(found, SW_SHOW)
            _user32.SetForegroundWindow(found)

    def _find_window(self) -> int | None:
        matches: list[int] = []
        needle = f"127.0.0.1:{self.port}" if self.port else ""

        @_WNDENUMPROC
        def callback(hwnd: int, _lparam: int) -> bool:
            if not _user32.IsWindowVisible(hwnd):
                return True
            length = _user32.GetWindowTextLengthW(hwnd)
            if length <= 0:
                return True
            title_buf = ctypes.create_unicode_buffer(length + 1)
            _user32.GetWindowTextW(hwnd, title_buf, length + 1)
            title = title_buf.value
            if "Infinite query X" not in title and (not needle or needle not in title):
                return True
            class_buf = ctypes.create_unicode_buffer(128)
            _user32.GetClassNameW(hwnd, class_buf, 128)
            if not class_buf.value.startswith("Chrome_WidgetWin"):
                return True
            if not _is_edge_window(hwnd):
                return True
            matches.append(int(hwnd))
            return True

        _user32.EnumWindows(callback, 0)
        return matches[0] if matches else None

    def _apply_styles(self, settings: dict[str, Any]) -> None:
        if not self.hwnd or self._base_style is None or self._base_exstyle is None:
            return
        style = self._base_style
        exstyle = self._base_exstyle

        if settings.get("desktopHideFullscreen", False):
            if _user32.IsZoomed(self.hwnd):
                _user32.ShowWindow(self.hwnd, SW_RESTORE)
            style &= ~WS_MAXIMIZEBOX

        if settings.get("desktopHideTaskbar", False) and _HAS_TRAY:
            exstyle = (exstyle | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW

        desired = (int(style), int(exstyle))
        if desired == self._applied_style:
            return

        _user32.SetWindowLongPtrW(self.hwnd, GWL_STYLE, desired[0])
        _user32.SetWindowLongPtrW(self.hwnd, GWL_EXSTYLE, desired[1])
        _user32.SetWindowPos(
            self.hwnd,
            None,
            0,
            0,
            0,
            0,
            SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        )
        self._applied_style = desired

    # ------------------------------------------------------------------
    # tray
    # ------------------------------------------------------------------
    def _load_tray_image(self):
        if not _HAS_TRAY:
            return None
        try:
            if self.icon_path.is_file():
                return Image.open(self.icon_path).convert("RGBA")
        except Exception:
            pass
        image = Image.new("RGBA", (64, 64), (10, 132, 255, 255))
        draw = ImageDraw.Draw(image)
        draw.ellipse((8, 8, 56, 56), fill=(255, 255, 255, 235))
        draw.ellipse((20, 20, 44, 44), fill=(10, 132, 255, 255))
        return image

    def _ensure_tray(self, needed: bool) -> None:
        if not _HAS_TRAY:
            return
        with self._lock:
            if needed and self._tray_icon is None:
                image = self._load_tray_image()
                menu = pystray.Menu(
                    pystray.MenuItem("显示主窗口", lambda icon, item: self.show_window(), default=True),
                    pystray.MenuItem("隐藏到托盘", lambda icon, item: self.hide_window()),
                    pystray.Menu.SEPARATOR,
                    pystray.MenuItem("退出 Infinite query X", lambda icon, item: self.quit()),
                )
                self._tray_icon = pystray.Icon("Infinite query X", image, "Infinite query X", menu)
                self._tray_thread = threading.Thread(
                    target=self._run_tray, daemon=True, name="iqx-tray"
                )
                self._tray_thread.start()
            if self._tray_icon is not None and self._tray_visible != bool(needed):
                try:
                    self._tray_icon.visible = bool(needed)
                    self._tray_visible = bool(needed)
                    self._tray_error = ""
                except Exception as exc:
                    self._tray_error = f"{type(exc).__name__}: {exc}"
                    self._tray_visible = False

    def _run_tray(self) -> None:
        try:
            if self._tray_icon is not None:
                self._tray_icon.run()
        except Exception as exc:
            self._tray_error = f"{type(exc).__name__}: {exc}"
