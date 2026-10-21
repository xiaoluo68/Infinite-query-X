/* Infinite query X —— 前端逻辑 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const DETAIL_URL = (id) => `https://show.bilibili.com/platform/detail.html?id=${id}`;

  // ---------- 文案 ----------
  const I18N = {
    'zh-CN': {
      'brand.sub': '票务监测',
  'boot.loading': '正在唤醒界面…', 'boot.ready': '准备就绪',
      'nav.tasks': '任务', 'nav.new': '新建', 'nav.settings': '设置', 'nav.desktop': '桌面', 'nav.help': '帮助', 'nav.about': '关于',
      'page.tasks.title': '任务', 'page.tasks.sub': '正在监控的展会与票种状态',
      'page.new.title': '新建', 'page.new.sub': '搜索展会，或浏览全国所有演出、漫展和比赛',
      'page.settings.title': '设置', 'page.settings.sub': '轮询频率、超时、帧率、动态取色与语言',
      'page.help.title': '帮助', 'page.help.sub': '版本更新、操作演示与桌面窗口说明',
      'page.about.title': '关于', 'page.about.sub': '一个只看余票、不抢票的监测工具',
      'stat.tasks': '监控任务', 'stat.tickets': '票种总数', 'stat.available': '预售中', 'stat.polls': '累计请求',
      'task.running': '运行中', 'task.stop': '停止', 'task.run': '运行', 'task.req': '请求', 'task.err': '错误',
      'task.upd': '更新', 'task.count': '票种 · 共 {n} 个', 'task.waiting': '还没有取到票种数据，稍等一下…',
      'task.colRestock': '今日回流', 'task.colLast': '最近可购', 'task.colTotal': '累计可购',
      'task.restockHint': '回流 = 状态变成「预售中」的次数；累计可购 = 处于可售状态的总时长（公开接口不提供剩余张数）',
      'task.onSaleNow': '可购中',
      'time.now': '刚刚', 'time.sec': '{n} 秒前', 'time.min': '{n} 分钟前', 'time.hour': '{n} 小时前',
      'toast.restock': '{name} 开始可购',
      'empty.title': '还没有监控任务', 'empty.sub': '去「新建」搜一个展会，点「监控」就会出现在这里', 'empty.cta': '去新建',
      'row.id': 'ID', 'row.city': '城市', 'row.date': '开展', 'row.sale': '开售', 'row.price': '票价', 'row.link': '详情',
      'new.ph': '搜索展会 / 演出 / 比赛，例如 BW2026、BML、CP31',
      'new.search': '搜索', 'new.all': '全国展会',
  'new.refresh': '刷新当前结果', 'new.refreshing': '正在刷新…',
      'new.hint': '按类型浏览，或输入关键词搜索；点「全国展会」可一次拉取全国所有演出、漫展、赛事和本地生活。',
      'cat.all': '全部', 'cat.exhibition': '展览', 'cat.show': '演出', 'cat.match': '赛事',
      'cat.local': '本地生活', 'cat.only': 'ONLY同人展', 'cat.nationwide': '全国',
      'new.notFound': '没搜到相关展会', 'new.tryAll': '换个关键词，或者点「全国展会」看看全部',
      'new.watch': '监控', 'new.adding': '添加中',
      'new.page': '第 {n} 页', 'new.pageOf': '第 {n} / {m} 页', 'new.total': '共 {n} 条',
      'new.loading': '正在搜索「{q}」…', 'new.loadingAll': '正在拉取全国展会列表{extra}…',
      'new.allEmpty': '还没拉到数据', 'new.allEmptyHint': '点上面的「全国展会」再试一次',
      'new.prev': '上一页', 'new.next': '下一页', 'new.loadingList': '正在加载列表…',
  'new.dateHint': '按系统时间定位今天，也可以查询其他日期', 'new.dateToday': '今天',
  'new.dateOpen': '查看当天活动', 'new.dateWindowKicker': '日期查询',
  'new.dateWindowSub': '全国活动 · 共 {n} 场', 'new.dateLoading': '正在读取这一天的活动…',
  'new.dateLoadingFirst': '正在汇总全国活动，第一次约需 10 秒…', 'new.dateEmpty': '这一天暂时没有查到活动',
  'new.dateEmptyHint': '换前一天 / 后一天，或选择其他日期试试', 'new.dateAll': '全部',
  'new.dateRefresh': '刷新', 'new.dateRange': '{a} 至 {b}', 'new.dateOther': '其他',
  'new.dateUpdated': '更新于 {time}',
      'settings.interval': '轮询间隔（秒）', 'settings.intervalHint': '每个任务的请求间隔，带 ±15% 随机抖动',
      'settings.timeout': '请求超时（秒）', 'settings.timeoutHint': '单次请求最长等待时间',
      'settings.log': '写日志', 'settings.logHint': '关闭时不留日志文件',
      'settings.language': '语言', 'settings.languageHint': '界面语言，切换后立即生效',
      'settings.fps': '界面帧率', 'settings.fpsUnlimited': '帧率无限制', 'settings.fpsDetect': '重新检测',
      'settings.fpsDetecting': '正在检测显示器刷新率…', 'settings.fpsDetected': '检测到 {n} Hz 刷新率',
      'settings.fpsFallback': '未检测到刷新率，按最高 {n} Hz 处理',
      'settings.fpsHint': '此设置控制界面脚本动画与光效的调度频率；页面合成动画仍由浏览器按显示器刷新率呈现。无限制表示不额外节流。',
      'fps.unlimited': '无限制', 'fps.value': '{n} fps', 'fps.max': '最高 {n} Hz',
      'settings.monet': '动态取色（Monet）', 'settings.monetEnable': '启用', 'settings.monetSeed': '种子色',
      'settings.monetScreen': '屏幕取色', 'settings.monetImage': '图片取色',
      'settings.monetHint': '使用官方 Material Color Utilities 从种子色生成 Material 3 Expressive 明暗配色；关闭时保持当前配色不变。',
  'settings.edge': '卡片流光颜色', 'settings.edgeRainbow': '彩虹', 'settings.edgeCustom': '自定义',
  'settings.edgeHint': '彩虹是默认效果；选择单色后，卡片边缘的流光会换成同色系的渐变。',
  'settings.fontTitle': '界面字体', 'settings.fontFamily': '字体', 'settings.fontSystem': '系统默认',
  'settings.fontYahei': '微软雅黑', 'settings.fontSegoe': 'Segoe UI', 'settings.fontSerif': '宋体 / 衬线',
  'settings.fontMono': '等宽字体', 'settings.fontSize': '字号', 'settings.fontWeight': '字重',
  'settings.fontRegular': '常规', 'settings.fontMedium': '中等', 'settings.fontBold': '加粗',
  'settings.fontHint': '调整字体族、字号和字重，立即应用到整个界面并记住。',
  'settings.fontAdd': '添加字体', 'settings.fontAddHint': '支持 TTF / OTF / WOFF / WOFF2，最大 20 MB',
  'settings.fontCustomGroup': '自定义字体', 'settings.fontUse': '使用', 'settings.fontDelete': '删除',
  'settings.fontEmpty': '还没有添加字体', 'settings.fontAdded': '已添加字体「{name}」',
  'settings.fontAddFailed': '字体添加失败', 'settings.fontTooLarge': '字体文件不能超过 20 MB',
  'settings.fontUnsupported': '只支持 TTF / OTF / WOFF / WOFF2', 'settings.fontDeleteFailed': '删除字体失败',
  'settings.fontRemoved': '已删除字体',
      'settings.monetUnsupported': '当前浏览器不支持该取色功能', 'settings.monetImageFailed': '未能从图片提取颜色',
      'settings.monetAnalyzing': '正在分析图片颜色…',
      'settings.save': '保存设置', 'settings.saved': '已保存，新任务立即生效', 'settings.failed': '保存失败',
      'desktop.title': '桌面窗口行为', 'desktop.sub': '控制 Edge 应用窗口的托盘、任务栏与窗口按钮；切换后立即生效。',
      'desktop.instant': '即时生效', 'desktop.saved': '已应用',
      'desktop.minimize': '最小化到托盘', 'desktop.minimizeHint': '最小化窗口时隐藏到系统托盘，点击托盘图标恢复。',
      'desktop.close': '关闭窗口时隐藏到托盘', 'desktop.closeHint': '点击关闭按钮后程序不退出，托盘图标保留；点击托盘重新打开窗口。',
      'desktop.taskbar': '隐藏任务栏图标', 'desktop.taskbarHint': '从任务栏和 Alt+Tab 隐藏应用窗口，托盘图标仍可恢复。',
      'desktop.fullscreen': '隐藏全屏按钮', 'desktop.fullscreenHint': '移除窗口控制按钮中的最大化 / 全屏切换按钮。',
      'desktop.note': '这些选项直接作用于桌面版 exe 的 Edge 应用窗口；全部关闭时恢复系统默认行为。关闭到托盘后可从托盘菜单彻底退出。',
      'about.desc': '只做余票监测，不提供抢票 / 下单功能',
      'about.intro': '基于 TaiMiao 的 Bili_Ticket_Monitor 项目开发，实时监测 Bilibili 会员购漫展演出赛事的余票状态（无抢票功能），只做余票监测，不提供抢票 / 下单功能。',
      'about.origin': '原项目',
      'about.introTitle': '软件介绍',
      'about.author': '作者', 'about.contact': '联系作者', 'about.github': 'GitHub 项目',
      'about.data': '数据来源', 'about.dataValue': '哔哩哔哩会员购公开接口',
      'about.ui': '界面灵感', 'about.license': '开源协议',
      'about.licenseValue': 'MIT（基于 TaiMiao/Bili_Ticket_Monitor）',
      'status.ready': '就绪', 'status.monitoring': '监控中', 'status.offline': '与后台断开，正在重试…',
      'status.tasks': '{n} 个任务',
      'toast.stopped': '已停止监控', 'toast.stopFailed': '停止失败，请稍后再试', 'toast.added': '已开始监控：{name}', 'toast.addFailed': '添加失败',
      'toast.searchFailed': '搜索失败，稍后再试', 'toast.allLoaded': '全国展会已加载：{n} 条',
      'toast.allFailed': '拉取失败，稍后再试', 'toast.copied': '链接已打开',
  'toast.refreshed': '已刷新', 'toast.refreshFailed': '刷新失败，稍后再试',
    },
    'zh-TW': {
      'brand.sub': '票務監測',
  'boot.loading': '正在喚醒介面…', 'boot.ready': '準備就緒',
      'nav.tasks': '任務', 'nav.new': '新建', 'nav.settings': '設定', 'nav.desktop': '桌面', 'nav.help': '說明', 'nav.about': '關於',
      'page.tasks.title': '任務', 'page.tasks.sub': '正在監控的展會與票種狀態',
      'page.new.title': '新建', 'page.new.sub': '搜尋展會，或瀏覽全國所有演出、漫展和比賽',
      'page.settings.title': '設定', 'page.settings.sub': '輪詢頻率、逾時、影格率、動態取色與語言',
      'page.help.title': '說明', 'page.help.sub': '版本更新、操作演示與桌面視窗說明',
      'page.about.title': '關於', 'page.about.sub': '一個只看餘票、不搶票的監測工具',
      'stat.tasks': '監控任務', 'stat.tickets': '票種總數', 'stat.available': '預售中', 'stat.polls': '累計請求',
      'task.running': '運行中', 'task.stop': '停止', 'task.run': '運行', 'task.req': '請求', 'task.err': '錯誤',
      'task.upd': '更新', 'task.count': '票種 · 共 {n} 個', 'task.waiting': '還沒有取到票種資料，稍等一下…',
      'task.colRestock': '今日回流', 'task.colLast': '最近可購', 'task.colTotal': '累計可購',
      'task.restockHint': '回流 = 狀態變成「預售中」的次數；累計可購 = 處於可售狀態的總時長（公開介面不提供剩餘張數）',
      'task.onSaleNow': '可購中',
      'time.now': '剛剛', 'time.sec': '{n} 秒前', 'time.min': '{n} 分鐘前', 'time.hour': '{n} 小時前',
      'toast.restock': '{name} 開始可購',
      'empty.title': '還沒有監控任務', 'empty.sub': '去「新建」搜一個展會，點「監控」就會出現在這裡', 'empty.cta': '去新建',
      'row.id': 'ID', 'row.city': '城市', 'row.date': '開展', 'row.sale': '開售', 'row.price': '票價', 'row.link': '詳情',
      'new.ph': '搜尋展會 / 演出 / 比賽，例如 BW2026、BML、CP31',
      'new.search': '搜尋', 'new.all': '全國展會',
  'new.refresh': '重新整理目前結果', 'new.refreshing': '正在重新整理…',
      'new.hint': '按類型瀏覽，或輸入關鍵字搜尋；點「全國展會」可一次拉取全國所有演出、漫展、賽事和本地生活。',
      'cat.all': '全部', 'cat.exhibition': '展覽', 'cat.show': '演出', 'cat.match': '賽事',
      'cat.local': '本地生活', 'cat.only': 'ONLY同人展', 'cat.nationwide': '全國',
      'new.notFound': '沒搜到相關展會', 'new.tryAll': '換個關鍵字，或者點「全國展會」看看全部',
      'new.watch': '監控', 'new.adding': '新增中',
      'new.page': '第 {n} 頁', 'new.pageOf': '第 {n} / {m} 頁', 'new.total': '共 {n} 筆',
      'new.loading': '正在搜尋「{q}」…', 'new.loadingAll': '正在拉取全國展會列表{extra}…',
      'new.allEmpty': '還沒拉到資料', 'new.allEmptyHint': '點上面的「全國展會」再試一次',
      'new.prev': '上一頁', 'new.next': '下一頁', 'new.loadingList': '正在載入列表…',
  'new.dateHint': '按系統時間定位今天，也可以查詢其他日期', 'new.dateToday': '今天',
  'new.dateOpen': '查看當天活動', 'new.dateWindowKicker': '日期查詢',
  'new.dateWindowSub': '全國活動 · 共 {n} 場', 'new.dateLoading': '正在讀取這一天的活動…',
  'new.dateLoadingFirst': '正在彙整全國活動，第一次約需 10 秒…', 'new.dateEmpty': '這一天暫時沒有查到活動',
  'new.dateEmptyHint': '換前一天 / 後一天，或選擇其他日期試試', 'new.dateAll': '全部',
  'new.dateRefresh': '重新整理', 'new.dateRange': '{a} 至 {b}', 'new.dateOther': '其他',
  'new.dateUpdated': '更新於 {time}',
      'settings.interval': '輪詢間隔（秒）', 'settings.intervalHint': '每個任務的請求間隔，帶 ±15% 隨機抖動',
      'settings.timeout': '請求逾時（秒）', 'settings.timeoutHint': '單次請求最長等待時間',
      'settings.log': '寫日誌', 'settings.logHint': '關閉時不留日誌檔',
      'settings.language': '語言', 'settings.languageHint': '介面語言，切換後立即生效',
      'settings.fps': '介面影格率', 'settings.fpsUnlimited': '影格率無限制', 'settings.fpsDetect': '重新偵測',
      'settings.fpsDetecting': '正在偵測螢幕更新率…', 'settings.fpsDetected': '偵測到 {n} Hz 更新率',
      'settings.fpsFallback': '未偵測到更新率，按最高 {n} Hz 處理',
      'settings.fpsHint': '此設定控制介面腳本動畫與光效的調度頻率；頁面合成動畫仍由瀏覽器依螢幕更新率呈現。無限制表示不額外節流。',
      'fps.unlimited': '無限制', 'fps.value': '{n} fps', 'fps.max': '最高 {n} Hz',
      'settings.monet': '動態取色（Monet）', 'settings.monetEnable': '啟用', 'settings.monetSeed': '種子色',
      'settings.monetScreen': '螢幕取色', 'settings.monetImage': '圖片取色',
      'settings.monetHint': '使用官方 Material Color Utilities 從種子色產生 Material 3 Expressive 明暗配色；關閉時保持目前配色不變。',
  'settings.edge': '卡片流光顏色', 'settings.edgeRainbow': '彩虹', 'settings.edgeCustom': '自訂',
  'settings.edgeHint': '彩虹是預設效果；選擇單色後，卡片邊緣的流光會換成同色系的漸層。',
  'settings.fontTitle': '介面字體', 'settings.fontFamily': '字體', 'settings.fontSystem': '系統預設',
  'settings.fontYahei': '微軟雅黑', 'settings.fontSegoe': 'Segoe UI', 'settings.fontSerif': '宋體 / 襯線',
  'settings.fontMono': '等寬字體', 'settings.fontSize': '字號', 'settings.fontWeight': '字重',
  'settings.fontRegular': '常規', 'settings.fontMedium': '中等', 'settings.fontBold': '加粗',
  'settings.fontHint': '調整字體族、字號和字重，立即套用到整個介面並記住。',
  'settings.fontAdd': '新增字體', 'settings.fontAddHint': '支援 TTF / OTF / WOFF / WOFF2，最大 20 MB',
  'settings.fontCustomGroup': '自訂字體', 'settings.fontUse': '使用', 'settings.fontDelete': '刪除',
  'settings.fontEmpty': '還沒有新增字體', 'settings.fontAdded': '已新增字體「{name}」',
  'settings.fontAddFailed': '字體新增失敗', 'settings.fontTooLarge': '字體檔不能超過 20 MB',
  'settings.fontUnsupported': '只支援 TTF / OTF / WOFF / WOFF2', 'settings.fontDeleteFailed': '刪除字體失敗',
  'settings.fontRemoved': '已刪除字體',
      'settings.monetUnsupported': '目前瀏覽器不支援此取色功能', 'settings.monetImageFailed': '無法從圖片擷取顏色',
      'settings.monetAnalyzing': '正在分析圖片顏色…',
      'settings.save': '儲存設定', 'settings.saved': '已儲存，新任務立即生效', 'settings.failed': '儲存失敗',
      'desktop.title': '桌面視窗行為', 'desktop.sub': '控制 Edge 應用視窗的托盤、工作列與視窗按鈕；切換後立即生效。',
      'desktop.instant': '即時生效', 'desktop.saved': '已套用',
      'desktop.minimize': '最小化到托盤', 'desktop.minimizeHint': '最小化視窗時隱藏到系統托盤，點擊托盤圖示恢復。',
      'desktop.close': '關閉視窗時隱藏到托盤', 'desktop.closeHint': '點擊關閉按鈕後程式不退出，托盤圖示保留；點擊托盤重新開啟視窗。',
      'desktop.taskbar': '隱藏工作列圖示', 'desktop.taskbarHint': '從工作列和 Alt+Tab 隱藏應用視窗，托盤圖示仍可恢復。',
      'desktop.fullscreen': '隱藏全螢幕按鈕', 'desktop.fullscreenHint': '移除視窗控制按鈕中的最大化 / 全螢幕切換按鈕。',
      'desktop.note': '這些選項直接作用於桌面版 exe 的 Edge 應用視窗；全部關閉時恢復系統預設行為。關閉到托盤後可從托盤選單徹底退出。',
      'about.desc': '只做餘票監測，不提供搶票 / 下單功能',
      'about.intro': '基於 TaiMiao 的 Bili_Ticket_Monitor 專案開發，即時監測 Bilibili 會員購漫展演出賽事的餘票狀態（無搶票功能），只做餘票監測，不提供搶票 / 下單功能。',
      'about.origin': '原專案',
      'about.introTitle': '軟體介紹',
      'about.author': '作者', 'about.contact': '聯繫作者', 'about.github': 'GitHub 專案',
      'about.data': '資料來源', 'about.dataValue': '嗶哩嗶哩會員購公開介面',
      'about.ui': '介面靈感', 'about.license': '開源授權',
      'about.licenseValue': 'MIT（基於 TaiMiao/Bili_Ticket_Monitor）',
      'status.ready': '就緒', 'status.monitoring': '監控中', 'status.offline': '與後台斷線，正在重試…',
      'status.tasks': '{n} 個任務',
      'toast.stopped': '已停止監控', 'toast.stopFailed': '停止失敗，請稍後再試', 'toast.added': '已開始監控：{name}', 'toast.addFailed': '新增失敗',
      'toast.searchFailed': '搜尋失敗，稍後再試', 'toast.allLoaded': '全國展會已載入：{n} 筆',
      'toast.allFailed': '拉取失敗，稍後再試', 'toast.copied': '已開啟連結',
  'toast.refreshed': '已重新整理', 'toast.refreshFailed': '重新整理失敗，稍後再試',
    },
    en: {
      'brand.sub': 'Ticket Monitor',
  'boot.loading': 'Waking up the interface…', 'boot.ready': 'Ready',
      'nav.tasks': 'Tasks', 'nav.new': 'New', 'nav.settings': 'Settings', 'nav.desktop': 'Desktop', 'nav.help': 'Help', 'nav.about': 'About',
      'page.tasks.title': 'Tasks', 'page.tasks.sub': 'Events being monitored and their ticket status',
      'page.new.title': 'New task', 'page.new.sub': 'Search an event, or browse all events nationwide',
      'page.settings.title': 'Settings', 'page.settings.sub': 'Polling, timeout, frame rate, dynamic color and language',
      'page.help.title': 'Help', 'page.help.sub': 'Release notes, guided tour and desktop behavior',
      'page.about.title': 'About', 'page.about.sub': 'A monitor that only watches ticket availability',
      'stat.tasks': 'Tasks', 'stat.tickets': 'Tickets', 'stat.available': 'On sale', 'stat.polls': 'Requests',
      'task.running': 'Running', 'task.stop': 'Stop', 'task.run': 'Uptime', 'task.req': 'Requests', 'task.err': 'Errors',
      'task.upd': 'Updated', 'task.count': 'Tickets · {n} total', 'task.waiting': 'No ticket data yet, one moment…',
      'task.colRestock': 'Restocks', 'task.colLast': 'Last seen', 'task.colTotal': 'On-sale time',
      'task.restockHint': 'Restocks = times the status turned “On sale”; On-sale time = total time it stayed on sale (the public API does not expose stock counts).',
      'task.onSaleNow': 'On sale',
      'time.now': 'just now', 'time.sec': '{n}s ago', 'time.min': '{n}m ago', 'time.hour': '{n}h ago',
      'toast.restock': '{name} is on sale',
      'empty.title': 'No tasks yet', 'empty.sub': 'Open “New”, search an event and click “Watch”', 'empty.cta': 'New task',
      'row.id': 'ID', 'row.city': 'City', 'row.date': 'Date', 'row.sale': 'Sale', 'row.price': 'Price', 'row.link': 'Details',
      'new.ph': 'Search events, e.g. BW2026, BML, CP31',
      'new.search': 'Search', 'new.all': 'All events',
  'new.refresh': 'Refresh results', 'new.refreshing': 'Refreshing…',
      'new.hint': 'Browse by type, or type a keyword. “All events” pulls every event nationwide at once.',
      'cat.all': 'All', 'cat.exhibition': 'Exhibition', 'cat.show': 'Performance', 'cat.match': 'Competition',
      'cat.local': 'Local life', 'cat.only': 'Doujin ONLY', 'cat.nationwide': 'All cities',
      'new.notFound': 'No matching events', 'new.tryAll': 'Try another keyword, or browse all events',
      'new.watch': 'Watch', 'new.adding': 'Adding',
      'new.page': 'Page {n}', 'new.pageOf': 'Page {n} / {m}', 'new.total': '{n} items',
      'new.loading': 'Searching “{q}”…', 'new.loadingAll': 'Loading all events{extra}…',
      'new.allEmpty': 'Nothing loaded yet', 'new.allEmptyHint': 'Click “All events” above to try again',
      'new.prev': 'Prev', 'new.next': 'Next', 'new.loadingList': 'Loading list…',
  'new.dateHint': 'Today follows your system time. Pick another date to look around.', 'new.dateToday': 'Today',
  'new.dateOpen': 'View events', 'new.dateWindowKicker': 'Date lookup',
  'new.dateWindowSub': 'All events · {n} total', 'new.dateLoading': 'Loading events for this day…',
  'new.dateLoadingFirst': 'Collecting nationwide events — the first load takes about 10 seconds…',
  'new.dateEmpty': 'No events found for this day', 'new.dateEmptyHint': 'Try the previous or next day, or pick another date',
  'new.dateAll': 'All', 'new.dateRefresh': 'Refresh', 'new.dateRange': '{a} – {b}', 'new.dateOther': 'Other',
  'new.dateUpdated': 'Updated {time}',
      'settings.interval': 'Poll interval (s)', 'settings.intervalHint': 'Delay between requests, with ±15% jitter',
      'settings.timeout': 'Timeout (s)', 'settings.timeoutHint': 'Maximum wait for a single request',
      'settings.log': 'Write log', 'settings.logHint': 'When off, no log file is created',
      'settings.language': 'Language', 'settings.languageHint': 'Applies immediately',
      'settings.fps': 'UI frame rate', 'settings.fpsUnlimited': 'Unlimited frame rate', 'settings.fpsDetect': 'Detect again',
      'settings.fpsDetecting': 'Detecting display refresh rate…', 'settings.fpsDetected': 'Detected {n} Hz refresh rate',
      'settings.fpsFallback': 'Refresh rate not detected, using up to {n} Hz',
      'settings.fpsHint': 'Controls the scheduling rate of scripted UI animations and light effects. Composited page animations still follow the browser’s display refresh rate. Unlimited disables extra throttling.',
      'fps.unlimited': 'Unlimited', 'fps.value': '{n} fps', 'fps.max': 'Up to {n} Hz',
      'settings.monet': 'Dynamic color (Monet)', 'settings.monetEnable': 'Enable', 'settings.monetSeed': 'Seed color',
      'settings.monetScreen': 'Pick from screen', 'settings.monetImage': 'Pick from image',
      'settings.monetHint': 'Generates a Material 3 Expressive light/dark palette from the seed color using the official Material Color Utilities. When off, the current colors stay unchanged.',
  'settings.edge': 'Card light color', 'settings.edgeRainbow': 'Rainbow', 'settings.edgeCustom': 'Custom',
  'settings.edgeHint': 'Rainbow is the default. Pick a color to turn the card light edges into a gradient of that hue.',
  'settings.fontTitle': 'Interface font', 'settings.fontFamily': 'Font', 'settings.fontSystem': 'System default',
  'settings.fontYahei': 'Microsoft YaHei', 'settings.fontSegoe': 'Segoe UI', 'settings.fontSerif': 'Serif',
  'settings.fontMono': 'Monospace', 'settings.fontSize': 'Size', 'settings.fontWeight': 'Weight',
  'settings.fontRegular': 'Regular', 'settings.fontMedium': 'Medium', 'settings.fontBold': 'Bold',
  'settings.fontHint': 'Adjust the font family, size and weight; applied instantly across the interface and remembered.',
  'settings.fontAdd': 'Add font', 'settings.fontAddHint': 'TTF / OTF / WOFF / WOFF2, up to 20 MB',
  'settings.fontCustomGroup': 'Custom fonts', 'settings.fontUse': 'Use', 'settings.fontDelete': 'Delete',
  'settings.fontEmpty': 'No custom fonts yet', 'settings.fontAdded': 'Added “{name}”',
  'settings.fontAddFailed': 'Could not add the font', 'settings.fontTooLarge': 'Font file must be 20 MB or smaller',
  'settings.fontUnsupported': 'Only TTF / OTF / WOFF / WOFF2 are supported', 'settings.fontDeleteFailed': 'Could not delete the font',
  'settings.fontRemoved': 'Font deleted',
      'settings.monetUnsupported': 'This color picker is not supported by the current browser', 'settings.monetImageFailed': 'Could not extract a color from this image',
      'settings.monetAnalyzing': 'Analyzing image colors…',
      'settings.save': 'Save', 'settings.saved': 'Saved, applies to new tasks', 'settings.failed': 'Save failed',
      'desktop.title': 'Desktop window behavior', 'desktop.sub': 'Controls the Edge app window tray, taskbar and caption buttons. Changes apply instantly.',
      'desktop.instant': 'Live', 'desktop.saved': 'Applied',
      'desktop.minimize': 'Minimize to tray', 'desktop.minimizeHint': 'Hide the window to the notification area when minimized; click the tray icon to restore.',
      'desktop.close': 'Hide to tray when closed', 'desktop.closeHint': 'Closing the window keeps the app running in the tray; click the tray icon to reopen it.',
      'desktop.taskbar': 'Hide taskbar icon', 'desktop.taskbarHint': 'Remove the window from the taskbar and Alt+Tab; the tray icon can still restore it.',
      'desktop.fullscreen': 'Hide fullscreen button', 'desktop.fullscreenHint': 'Remove the maximize / fullscreen button from the window controls.',
      'desktop.note': 'These options apply to the desktop exe’s Edge app window. Turn everything off to restore system defaults. Use the tray menu to quit while the window is in the tray.',
      'about.desc': 'Availability monitoring only — no purchasing or booking',
      'about.intro':
        "Built on TaiMiao's Bili_Ticket_Monitor. Watches Bilibili membership ticket availability for conventions, concerts and competitions in real time — availability monitoring only, no ticket-grabbing or ordering.",
      'about.origin': 'Original project',
      'about.introTitle': 'About this app',
      'about.author': 'Author', 'about.contact': 'Contact', 'about.github': 'GitHub project',
      'about.data': 'Data source', 'about.dataValue': 'Bilibili membership public API',
      'about.ui': 'UI inspired by', 'about.license': 'License',
      'about.licenseValue': 'MIT (based on TaiMiao/Bili_Ticket_Monitor)',
      'status.ready': 'Ready', 'status.monitoring': 'Monitoring', 'status.offline': 'Disconnected, retrying…',
      'status.tasks': '{n} tasks',
      'toast.stopped': 'Monitoring stopped', 'toast.stopFailed': 'Could not stop monitoring, try again', 'toast.added': 'Now watching: {name}', 'toast.addFailed': 'Failed to add',
      'toast.searchFailed': 'Search failed, try again later', 'toast.allLoaded': 'Loaded {n} events',
      'toast.allFailed': 'Failed to load, try again later', 'toast.copied': 'Link opened',
  'toast.refreshed': 'Refreshed', 'toast.refreshFailed': 'Refresh failed, try again later',
    },
    ja: {
      'brand.sub': 'チケット監視',
  'boot.loading': 'インターフェースを起動中…', 'boot.ready': '準備完了',
      'nav.tasks': 'タスク', 'nav.new': '新規', 'nav.settings': '設定', 'nav.desktop': 'デスクトップ', 'nav.help': 'ヘルプ', 'nav.about': '情報',
      'page.tasks.title': 'タスク', 'page.tasks.sub': '監視中のイベントとチケット状況',
      'page.new.title': '新規タスク', 'page.new.sub': 'イベントを検索、または全国のイベントを一覧',
      'page.settings.title': '設定', 'page.settings.sub': '更新間隔・タイムアウト・フレームレート・ダイナミックカラー・言語',
      'page.help.title': 'ヘルプ', 'page.help.sub': 'バージョン更新・操作ガイド・デスクトップ動作',
      'page.about.title': '情報', 'page.about.sub': '残席を見守るだけの監視ツール',
      'stat.tasks': '監視タスク', 'stat.tickets': 'チケット数', 'stat.available': '販売中', 'stat.polls': 'リクエスト',
      'task.running': '実行中', 'task.stop': '停止', 'task.run': '稼働', 'task.req': 'リクエスト', 'task.err': 'エラー',
      'task.upd': '更新', 'task.count': 'チケット · 全 {n} 件', 'task.waiting': 'チケット情報を取得中です…',
      'task.colRestock': '本日の復活', 'task.colLast': '最終販売', 'task.colTotal': '累計販売',
      'task.restockHint': '復活 = 状態が「販売中」になった回数／累計販売 = 販売中だった合計時間（公開 API に残数はありません）',
      'task.onSaleNow': '販売中',
      'time.now': 'たった今', 'time.sec': '{n} 秒前', 'time.min': '{n} 分前', 'time.hour': '{n} 時間前',
      'toast.restock': '{name} が販売開始',
      'empty.title': 'タスクがありません', 'empty.sub': '「新規」でイベントを検索し、「監視」を押してください', 'empty.cta': '新規作成',
      'row.id': 'ID', 'row.city': '都市', 'row.date': '開催', 'row.sale': '販売', 'row.price': '料金', 'row.link': '詳細',
      'new.ph': 'イベントを検索（例：BW2026、BML、CP31）',
      'new.search': '検索', 'new.all': '全国のイベント',
  'new.refresh': '検索結果を更新', 'new.refreshing': '更新中…',
      'new.hint': '種類で絞り込むか、キーワードで検索。「全国のイベント」で全国分をまとめて取得します。',
      'cat.all': 'すべて', 'cat.exhibition': '展示', 'cat.show': '公演', 'cat.match': '大会',
      'cat.local': 'ローカル', 'cat.only': '同人オンリー', 'cat.nationwide': '全国',
      'new.notFound': '該当するイベントがありません', 'new.tryAll': '別のキーワードか、全国一覧をお試しください',
      'new.watch': '監視', 'new.adding': '追加中',
      'new.page': '{n} ページ', 'new.pageOf': '{n} / {m} ページ', 'new.total': '全 {n} 件',
      'new.loading': '「{q}」を検索中…', 'new.loadingAll': '全国のイベントを取得中{extra}…',
      'new.allEmpty': 'まだ取得できていません', 'new.allEmptyHint': '上の「全国のイベント」をもう一度押してください',
      'new.prev': '前へ', 'new.next': '次へ', 'new.loadingList': '一覧を読み込み中…',
  'new.dateHint': 'システム日付を基準に今日を表示します。別の日付も選べます。', 'new.dateToday': '今日',
  'new.dateOpen': 'この日のイベントを見る', 'new.dateWindowKicker': '日付検索',
  'new.dateWindowSub': '全国のイベント · 全 {n} 件', 'new.dateLoading': 'この日のイベントを読み込み中…',
  'new.dateLoadingFirst': '全国のイベントを集計中です。初回は約 10 秒かかります…',
  'new.dateEmpty': 'この日はイベントが見つかりません', 'new.dateEmptyHint': '前日 / 翌日、または別の日付をお試しください',
  'new.dateAll': 'すべて', 'new.dateRefresh': '更新', 'new.dateRange': '{a} 〜 {b}', 'new.dateOther': 'その他',
  'new.dateUpdated': '{time} 更新',
      'settings.interval': '更新間隔（秒）', 'settings.intervalHint': 'リクエスト間隔（±15% のゆらぎあり）',
      'settings.timeout': 'タイムアウト（秒）', 'settings.timeoutHint': '1 回のリクエストの最大待ち時間',
      'settings.log': 'ログ出力', 'settings.logHint': 'オフのときはログを作成しません',
      'settings.language': '言語', 'settings.languageHint': 'すぐに反映されます',
      'settings.fps': '画面フレームレート', 'settings.fpsUnlimited': 'フレームレート無制限', 'settings.fpsDetect': '再検出',
      'settings.fpsDetecting': 'ディスプレイのリフレッシュレートを検出中…', 'settings.fpsDetected': '{n} Hz のリフレッシュレートを検出',
      'settings.fpsFallback': 'リフレッシュレートを検出できず、最大 {n} Hz で処理します',
      'settings.fpsHint': 'スクリプト製 UI アニメーションと光効果の更新頻度を制御します。合成されるページアニメーションはブラウザのリフレッシュレートに従います。「無制限」は追加の制限なしを意味します。',
      'fps.unlimited': '無制限', 'fps.value': '{n} fps', 'fps.max': '最大 {n} Hz',
      'settings.monet': 'ダイナミックカラー（Monet）', 'settings.monetEnable': '有効', 'settings.monetSeed': 'シードカラー',
      'settings.monetScreen': '画面から取得', 'settings.monetImage': '画像から取得',
      'settings.monetHint': '公式 Material Color Utilities を使ってシードカラーから Material 3 Expressive のライト／ダーク配色を生成します。オフのときは現在の配色を維持します。',
  'settings.edge': 'カードの流光カラー', 'settings.edgeRainbow': 'レインボー', 'settings.edgeCustom': 'カスタム',
  'settings.edgeHint': 'レインボーが既定です。色を選ぶとカード縁の流光が同系色のグラデーションに変わります。',
  'settings.fontTitle': '画面フォント', 'settings.fontFamily': 'フォント', 'settings.fontSystem': 'システム既定',
  'settings.fontYahei': 'Microsoft YaHei', 'settings.fontSegoe': 'Segoe UI', 'settings.fontSerif': '明朝 / セリフ',
  'settings.fontMono': '等幅', 'settings.fontSize': 'サイズ', 'settings.fontWeight': 'ウェイト',
  'settings.fontRegular': '標準', 'settings.fontMedium': '中', 'settings.fontBold': '太字',
  'settings.fontHint': 'フォント種・サイズ・ウェイトを調整すると、すぐに画面全体へ反映され保存されます。',
  'settings.fontAdd': 'フォントを追加', 'settings.fontAddHint': 'TTF / OTF / WOFF / WOFF2、最大 20 MB',
  'settings.fontCustomGroup': 'カスタムフォント', 'settings.fontUse': '使用', 'settings.fontDelete': '削除',
  'settings.fontEmpty': '追加したフォントはありません', 'settings.fontAdded': '「{name}」を追加しました',
  'settings.fontAddFailed': 'フォントを追加できませんでした', 'settings.fontTooLarge': 'フォントは 20 MB 以下にしてください',
  'settings.fontUnsupported': 'TTF / OTF / WOFF / WOFF2 のみ対応', 'settings.fontDeleteFailed': 'フォントを削除できませんでした',
  'settings.fontRemoved': 'フォントを削除しました',
      'settings.monetUnsupported': 'このブラウザはカラー取得に対応していません', 'settings.monetImageFailed': '画像から色を抽出できませんでした',
      'settings.monetAnalyzing': '画像の色を解析中…',
      'settings.save': '保存', 'settings.saved': '保存しました', 'settings.failed': '保存に失敗しました',
      'desktop.title': 'デスクトップウィンドウの動作', 'desktop.sub': 'Edge アプリウィンドウのトレイ、タスクバー、ウィンドウボタンを制御します。変更はすぐに反映されます。',
      'desktop.instant': 'すぐ反映', 'desktop.saved': '適用済み',
      'desktop.minimize': 'トレイに最小化', 'desktop.minimizeHint': '最小化時に通知領域へ隠し、トレイアイコンをクリックすると復元します。',
      'desktop.close': '閉じるときトレイに隠す', 'desktop.closeHint': '閉じるボタンを押してもアプリは終了せず、トレイに残ります。トレイをクリックすると再表示します。',
      'desktop.taskbar': 'タスクバーアイコンを隠す', 'desktop.taskbarHint': 'タスクバーと Alt+Tab から隠します。トレイアイコンから復元できます。',
      'desktop.fullscreen': '全画面ボタンを隠す', 'desktop.fullscreenHint': 'ウィンドウ操作ボタンから最大化 / 全画面ボタンを削除します。',
      'desktop.note': 'これらの設定はデスクトップ版 exe の Edge アプリウィンドウに適用されます。すべてオフにするとシステム既定に戻ります。トレイに隠した後はトレイメニューから完全終了できます。',
      'about.desc': '残席監視のみ。購入・予約機能はありません',
      'about.intro': 'TaiMiao の Bili_Ticket_Monitor をベースに開発。Bilibili 会員購の漫展・公演・大会の残席状況をリアルタイムで監視します（搶票機能なし）。残席監視のみで、購入・予約機能はありません。',
      'about.origin': '元プロジェクト',
      'about.introTitle': 'このアプリについて',
      'about.author': '作者', 'about.contact': '連絡先', 'about.github': 'GitHub プロジェクト',
      'about.data': 'データ提供', 'about.dataValue': 'ビリビリ会員購の公開 API',
      'about.ui': 'UI 参考', 'about.license': 'ライセンス',
      'about.licenseValue': 'MIT（TaiMiao/Bili_Ticket_Monitor ベース）',
      'status.ready': '待機中', 'status.monitoring': '監視中', 'status.offline': '接続が切れました。再試行中…',
      'status.tasks': '{n} 件のタスク',
      'toast.stopped': '監視を停止しました', 'toast.stopFailed': '監視を停止できませんでした', 'toast.added': '監視を開始：{name}', 'toast.addFailed': '追加に失敗しました',
      'toast.searchFailed': '検索に失敗しました', 'toast.allLoaded': '{n} 件のイベントを読み込みました',
      'toast.allFailed': '取得に失敗しました', 'toast.copied': 'リンクを開きました',
  'toast.refreshed': '更新しました', 'toast.refreshFailed': '更新に失敗しました',
    },
    ko: {
      'brand.sub': '티켓 모니터',
  'boot.loading': '인터페이스를 깨우는 중…', 'boot.ready': '준비 완료',
      'nav.tasks': '작업', 'nav.new': '새로 만들기', 'nav.settings': '설정', 'nav.desktop': '데스크톱', 'nav.help': '도움말', 'nav.about': '정보',
      'page.tasks.title': '작업', 'page.tasks.sub': '모니터링 중인 행사와 티켓 상태',
      'page.new.title': '새 작업', 'page.new.sub': '행사를 검색하거나 전국 행사를 둘러보세요',
      'page.settings.title': '설정', 'page.settings.sub': '주기, 시간 초과, 프레임률, 다이내믹 컬러, 언어',
      'page.help.title': '도움말', 'page.help.sub': '버전 업데이트, 사용 안내, 데스크톱 동작',
      'page.about.title': '정보', 'page.about.sub': '잔여 티켓만 지켜보는 모니터',
      'stat.tasks': '작업', 'stat.tickets': '티켓', 'stat.available': '판매 중', 'stat.polls': '요청',
      'task.running': '실행 중', 'task.stop': '중지', 'task.run': '가동', 'task.req': '요청', 'task.err': '오류',
      'task.upd': '업데이트', 'task.count': '티켓 · 총 {n}개', 'task.waiting': '티켓 정보를 가져오는 중…',
      'task.colRestock': '오늘 복귀', 'task.colLast': '최근 판매', 'task.colTotal': '누적 판매',
      'task.restockHint': '복귀 = 상태가 「판매 중」이 된 횟수, 누적 판매 = 판매 중이던 총 시간 (공개 API에는 잔여 수량이 없습니다)',
      'task.onSaleNow': '판매 중',
      'time.now': '방금', 'time.sec': '{n}초 전', 'time.min': '{n}분 전', 'time.hour': '{n}시간 전',
      'toast.restock': '{name} 판매 시작',
      'empty.title': '작업이 없습니다', 'empty.sub': '「새로 만들기」에서 행사를 검색하고 「모니터링」을 누르세요', 'empty.cta': '새로 만들기',
      'row.id': 'ID', 'row.city': '도시', 'row.date': '개최', 'row.sale': '판매', 'row.price': '가격', 'row.link': '상세',
      'new.ph': '행사 검색 (예: BW2026, BML, CP31)',
      'new.search': '검색', 'new.all': '전국 행사',
  'new.refresh': '결과 새로고침', 'new.refreshing': '새로고침 중…',
      'new.hint': '유형으로 찾아보거나 키워드로 검색하세요. 「전국 행사」는 전국 목록을 한 번에 가져옵니다.',
      'cat.all': '전체', 'cat.exhibition': '전시', 'cat.show': '공연', 'cat.match': '대회',
      'cat.local': '로컬', 'cat.only': '동인 ONLY', 'cat.nationwide': '전국',
      'new.notFound': '검색 결과가 없습니다', 'new.tryAll': '다른 키워드나 전국 목록을 시도해 보세요',
      'new.watch': '모니터링', 'new.adding': '추가 중',
      'new.page': '{n} 페이지', 'new.pageOf': '{n} / {m} 페이지', 'new.total': '총 {n}개',
      'new.loading': '「{q}」 검색 중…', 'new.loadingAll': '전국 행사를 불러오는 중{extra}…',
      'new.allEmpty': '아직 불러오지 못했습니다', 'new.allEmptyHint': '위의 「전국 행사」를 다시 눌러 주세요',
      'new.prev': '이전', 'new.next': '다음', 'new.loadingList': '목록을 불러오는 중…',
  'new.dateHint': '시스템 시간을 기준으로 오늘을 표시합니다. 다른 날짜도 선택할 수 있습니다.', 'new.dateToday': '오늘',
  'new.dateOpen': '이 날 행사 보기', 'new.dateWindowKicker': '날짜 조회',
  'new.dateWindowSub': '전국 행사 · 총 {n}건', 'new.dateLoading': '이 날의 행사를 불러오는 중…',
  'new.dateLoadingFirst': '전국 행사를 모으는 중입니다. 첫 로딩은 약 10초 걸립니다…',
  'new.dateEmpty': '이 날은 행사가 없습니다', 'new.dateEmptyHint': '전날 / 다음 날 또는 다른 날짜를 선택해 보세요',
  'new.dateAll': '전체', 'new.dateRefresh': '새로고침', 'new.dateRange': '{a} ~ {b}', 'new.dateOther': '기타',
  'new.dateUpdated': '{time} 업데이트',
      'settings.interval': '주기 (초)', 'settings.intervalHint': '요청 간격, ±15% 무작위 변동',
      'settings.timeout': '시간 초과 (초)', 'settings.timeoutHint': '요청 1회 최대 대기 시간',
      'settings.log': '로그 기록', 'settings.logHint': '끄면 로그 파일을 만들지 않습니다',
      'settings.language': '언어', 'settings.languageHint': '즉시 적용됩니다',
      'settings.fps': '화면 프레임률', 'settings.fpsUnlimited': '프레임률 무제한', 'settings.fpsDetect': '다시 감지',
      'settings.fpsDetecting': '디스플레이 주사율 감지 중…', 'settings.fpsDetected': '{n} Hz 주사율 감지됨',
      'settings.fpsFallback': '주사율을 감지하지 못해 최대 {n} Hz로 처리',
      'settings.fpsHint': '스크립트 UI 애니메이션과 빛 효과의 업데이트 주기를 제어합니다. 합성 페이지 애니메이션은 브라우저의 화면 주사율을 따릅니다. 무제한은 추가 제한 없음입니다.',
      'fps.unlimited': '무제한', 'fps.value': '{n} fps', 'fps.max': '최대 {n} Hz',
      'settings.monet': '다이내믹 컬러(Monet)', 'settings.monetEnable': '사용', 'settings.monetSeed': '시드 색상',
      'settings.monetScreen': '화면에서 추출', 'settings.monetImage': '이미지에서 추출',
      'settings.monetHint': '공식 Material Color Utilities로 시드 색상에서 Material 3 Expressive 라이트/다크 팔레트를 생성합니다. 끄면 현재 색상이 유지됩니다.',
  'settings.edge': '카드 빛 색상', 'settings.edgeRainbow': '무지개', 'settings.edgeCustom': '사용자 지정',
  'settings.edgeHint': '무지개가 기본입니다. 색을 고르면 카드 가장자리의 빛이 같은 계열의 그라데이션으로 바뀝니다.',
  'settings.fontTitle': '인터페이스 글꼴', 'settings.fontFamily': '글꼴', 'settings.fontSystem': '시스템 기본',
  'settings.fontYahei': '맑은 고딕', 'settings.fontSegoe': 'Segoe UI', 'settings.fontSerif': '명조 / 세리프',
  'settings.fontMono': '고정폭', 'settings.fontSize': '크기', 'settings.fontWeight': '굵기',
  'settings.fontRegular': '보통', 'settings.fontMedium': '중간', 'settings.fontBold': '굵게',
  'settings.fontHint': '글꼴 종류·크기·굵기를 조정하면 즉시 전체 화면에 적용되고 저장됩니다.',
  'settings.fontAdd': '글꼴 추가', 'settings.fontAddHint': 'TTF / OTF / WOFF / WOFF2, 최대 20 MB',
  'settings.fontCustomGroup': '사용자 글꼴', 'settings.fontUse': '사용', 'settings.fontDelete': '삭제',
  'settings.fontEmpty': '추가한 글꼴이 없습니다', 'settings.fontAdded': '“{name}” 글꼴을 추가했습니다',
  'settings.fontAddFailed': '글꼴을 추가하지 못했습니다', 'settings.fontTooLarge': '글꼴 파일은 20 MB 이하여야 합니다',
  'settings.fontUnsupported': 'TTF / OTF / WOFF / WOFF2만 지원합니다', 'settings.fontDeleteFailed': '글꼴을 삭제하지 못했습니다',
  'settings.fontRemoved': '글꼴을 삭제했습니다',
      'settings.monetUnsupported': '현재 브라우저는 이 색상 추출을 지원하지 않습니다', 'settings.monetImageFailed': '이미지에서 색상을 추출하지 못했습니다',
      'settings.monetAnalyzing': '이미지 색상 분석 중…',
      'settings.save': '저장', 'settings.saved': '저장되었습니다', 'settings.failed': '저장 실패',
      'desktop.title': '데스크톱 창 동작', 'desktop.sub': 'Edge 앱 창의 트레이, 작업 표시줄, 창 버튼을 제어합니다. 변경 사항은 즉시 적용됩니다.',
      'desktop.instant': '즉시 적용', 'desktop.saved': '적용됨',
      'desktop.minimize': '트레이로 최소화', 'desktop.minimizeHint': '창을 최소화하면 알림 영역으로 숨기고, 트레이 아이콘을 클릭하면 복원합니다.',
      'desktop.close': '닫을 때 트레이로 숨기기', 'desktop.closeHint': '닫기 버튼을 눌러도 앱이 종료되지 않고 트레이에 남습니다. 트레이를 클릭하면 다시 엽니다.',
      'desktop.taskbar': '작업 표시줄 아이콘 숨기기', 'desktop.taskbarHint': '작업 표시줄과 Alt+Tab에서 창을 숨깁니다. 트레이 아이콘으로 복원할 수 있습니다.',
      'desktop.fullscreen': '전체 화면 버튼 숨기기', 'desktop.fullscreenHint': '창 컨트롤에서 최대화 / 전체 화면 버튼을 제거합니다.',
      'desktop.note': '이 옵션은 데스크톱 exe의 Edge 앱 창에 적용됩니다. 모두 끄면 시스템 기본 동작으로 돌아갑니다. 트레이에 숨긴 뒤에는 트레이 메뉴에서 완전히 종료할 수 있습니다.',
      'about.desc': '잔여 티켓 모니터링 전용, 구매 기능 없음',
      'about.intro': 'TaiMiao의 Bili_Ticket_Monitor를 기반으로 개발. Bilibili 멤버십의 만화 전시·공연·대회 잔여 티켓을 실시간으로 모니터링합니다(구매 대행 없음). 잔여 티켓 확인 전용이며 구매 기능은 없습니다.',
      'about.origin': '원본 프로젝트',
      'about.introTitle': '앱 소개',
      'about.author': '제작', 'about.contact': '연락처', 'about.github': 'GitHub 프로젝트',
      'about.data': '데이터', 'about.dataValue': '빌리빌리 멤버십 공개 API',
      'about.ui': 'UI 참고', 'about.license': '라이선스',
      'about.licenseValue': 'MIT (TaiMiao/Bili_Ticket_Monitor 기반)',
      'status.ready': '대기', 'status.monitoring': '모니터링 중', 'status.offline': '연결 끊김, 재시도 중…',
      'status.tasks': '{n}개 작업',
      'toast.stopped': '모니터링을 중지했습니다', 'toast.stopFailed': '모니터링을 중지하지 못했습니다', 'toast.added': '모니터링 시작: {name}', 'toast.addFailed': '추가 실패',
      'toast.searchFailed': '검색 실패', 'toast.allLoaded': '행사 {n}개를 불러왔습니다',
      'toast.allFailed': '불러오기 실패', 'toast.copied': '링크를 열었습니다',
  'toast.refreshed': '새로고침 완료', 'toast.refreshFailed': '새로고침 실패',
    },
    ru: {
      'brand.sub': 'Мониторинг билетов',
  'boot.loading': 'Пробуждаем интерфейс…', 'boot.ready': 'Готово',
      'nav.tasks': 'Задачи', 'nav.new': 'Новая', 'nav.settings': 'Настройки', 'nav.desktop': 'Рабочий стол', 'nav.help': 'Помощь', 'nav.about': 'О программе',
      'page.tasks.title': 'Задачи', 'page.tasks.sub': 'Отслеживаемые события и статус билетов',
      'page.new.title': 'Новая задача', 'page.new.sub': 'Найдите событие или просмотрите все события',
      'page.settings.title': 'Настройки', 'page.settings.sub': 'Интервал, таймаут, частота кадров, динамический цвет и язык',
      'page.help.title': 'Помощь', 'page.help.sub': 'Обновления, руководство и поведение окна',
      'page.about.title': 'О программе', 'page.about.sub': 'Мониторинг без покупки билетов',
      'stat.tasks': 'Задачи', 'stat.tickets': 'Билеты', 'stat.available': 'В продаже', 'stat.polls': 'Запросы',
      'task.running': 'Работает', 'task.stop': 'Стоп', 'task.run': 'Время', 'task.req': 'Запросы', 'task.err': 'Ошибки',
      'task.upd': 'Обновлено', 'task.count': 'Билеты · всего {n}', 'task.waiting': 'Данные о билетах загружаются…',
      'task.colRestock': 'Возвраты', 'task.colLast': 'Последняя', 'task.colTotal': 'В продаже',
      'task.restockHint': 'Возвраты = сколько раз статус стал «В продаже»; «В продаже» — суммарное время (публичный API не отдаёт остатки).',
      'task.onSaleNow': 'В продаже',
      'time.now': 'только что', 'time.sec': '{n} с назад', 'time.min': '{n} мин назад', 'time.hour': '{n} ч назад',
      'toast.restock': '{name} в продаже',
      'empty.title': 'Задач пока нет', 'empty.sub': 'Откройте «Новая», найдите событие и нажмите «Следить»', 'empty.cta': 'Новая задача',
      'row.id': 'ID', 'row.city': 'Город', 'row.date': 'Дата', 'row.sale': 'Продажа', 'row.price': 'Цена', 'row.link': 'Детали',
      'new.ph': 'Поиск событий, напр. BW2026, BML, CP31',
      'new.search': 'Поиск', 'new.all': 'Все события',
  'new.refresh': 'Обновить результаты', 'new.refreshing': 'Обновление…',
      'new.hint': 'Просматривайте по типу или ищите по слову. «Все события» загружает всё сразу.',
      'cat.all': 'Все', 'cat.exhibition': 'Выставки', 'cat.show': 'Концерты', 'cat.match': 'Соревнования',
      'cat.local': 'Локальные', 'cat.only': 'Додзин-ONLY', 'cat.nationwide': 'Вся страна',
      'new.notFound': 'Ничего не найдено', 'new.tryAll': 'Попробуйте другое слово или все события',
      'new.watch': 'Следить', 'new.adding': 'Добавление',
      'new.page': 'Стр. {n}', 'new.pageOf': 'Стр. {n} / {m}', 'new.total': 'всего {n}',
      'new.loading': 'Поиск «{q}»…', 'new.loadingAll': 'Загрузка всех событий{extra}…',
      'new.allEmpty': 'Пока ничего не загружено', 'new.allEmptyHint': 'Нажмите «Все события» ещё раз',
      'new.prev': 'Назад', 'new.next': 'Вперёд', 'new.loadingList': 'Загрузка списка…',
  'new.dateHint': 'Сегодня определяется по системному времени. Можно выбрать другую дату.', 'new.dateToday': 'Сегодня',
  'new.dateOpen': 'События этого дня', 'new.dateWindowKicker': 'Поиск по дате',
  'new.dateWindowSub': 'События по всей стране · всего {n}', 'new.dateLoading': 'Загружаем события этого дня…',
  'new.dateLoadingFirst': 'Собираем события по всей стране — первый раз около 10 секунд…',
  'new.dateEmpty': 'На этот день событий не найдено', 'new.dateEmptyHint': 'Попробуйте предыдущий / следующий день или другую дату',
  'new.dateAll': 'Все', 'new.dateRefresh': 'Обновить', 'new.dateRange': '{a} — {b}', 'new.dateOther': 'Другое',
  'new.dateUpdated': 'Обновлено {time}',
      'settings.interval': 'Интервал (с)', 'settings.intervalHint': 'Задержка между запросами, ±15% разброс',
      'settings.timeout': 'Таймаут (с)', 'settings.timeoutHint': 'Максимальное ожидание запроса',
      'settings.log': 'Вести журнал', 'settings.logHint': 'Если выключено, файл не создаётся',
      'settings.language': 'Язык', 'settings.languageHint': 'Применяется сразу',
      'settings.fps': 'Частота кадров интерфейса', 'settings.fpsUnlimited': 'Без ограничения частоты', 'settings.fpsDetect': 'Определить снова',
      'settings.fpsDetecting': 'Определение частоты обновления экрана…', 'settings.fpsDetected': 'Обнаружено {n} Гц',
      'settings.fpsFallback': 'Частота обновления не обнаружена, используется до {n} Гц',
      'settings.fpsHint': 'Управляет частотой обновления скриптовых анимаций и световых эффектов. Композитные анимации страницы по-прежнему следуют частоте обновления браузера. «Без ограничения» отключает дополнительное ограничение.',
      'fps.unlimited': 'Без ограничения', 'fps.value': '{n} fps', 'fps.max': 'До {n} Гц',
      'settings.monet': 'Динамический цвет (Monet)', 'settings.monetEnable': 'Включить', 'settings.monetSeed': 'Исходный цвет',
      'settings.monetScreen': 'Взять с экрана', 'settings.monetImage': 'Взять с изображения',
      'settings.monetHint': 'Создаёт светлую/тёмную палитру Material 3 Expressive из исходного цвета с помощью официальной библиотеки Material Color Utilities. Когда выключено, текущие цвета не меняются.',
  'settings.edge': 'Цвет подсветки карточек', 'settings.edgeRainbow': 'Радуга', 'settings.edgeCustom': 'Свой цвет',
  'settings.edgeHint': 'По умолчанию радуга. Выберите цвет — подсветка краёв карточек станет градиентом этого оттенка.',
  'settings.fontTitle': 'Шрифт интерфейса', 'settings.fontFamily': 'Шрифт', 'settings.fontSystem': 'Системный',
  'settings.fontYahei': 'Microsoft YaHei', 'settings.fontSegoe': 'Segoe UI', 'settings.fontSerif': 'С засечками',
  'settings.fontMono': 'Моноширинный', 'settings.fontSize': 'Размер', 'settings.fontWeight': 'Насыщенность',
  'settings.fontRegular': 'Обычная', 'settings.fontMedium': 'Средняя', 'settings.fontBold': 'Полужирная',
  'settings.fontHint': 'Настройте семейство, размер и насыщенность шрифта — изменения сразу применяются и сохраняются.',
  'settings.fontAdd': 'Добавить шрифт', 'settings.fontAddHint': 'TTF / OTF / WOFF / WOFF2, до 20 МБ',
  'settings.fontCustomGroup': 'Свои шрифты', 'settings.fontUse': 'Использовать', 'settings.fontDelete': 'Удалить',
  'settings.fontEmpty': 'Своих шрифтов пока нет', 'settings.fontAdded': 'Шрифт «{name}» добавлен',
  'settings.fontAddFailed': 'Не удалось добавить шрифт', 'settings.fontTooLarge': 'Размер шрифта — не более 20 МБ',
  'settings.fontUnsupported': 'Поддерживаются только TTF / OTF / WOFF / WOFF2', 'settings.fontDeleteFailed': 'Не удалось удалить шрифт',
  'settings.fontRemoved': 'Шрифт удалён',
      'settings.monetUnsupported': 'Этот браузер не поддерживает выбор цвета', 'settings.monetImageFailed': 'Не удалось извлечь цвет из изображения',
      'settings.monetAnalyzing': 'Анализ цветов изображения…',
      'settings.save': 'Сохранить', 'settings.saved': 'Сохранено', 'settings.failed': 'Ошибка сохранения',
      'desktop.title': 'Поведение окна', 'desktop.sub': 'Управляет лотком, панелью задач и кнопками окна Edge. Изменения применяются сразу.',
      'desktop.instant': 'Сразу', 'desktop.saved': 'Применено',
      'desktop.minimize': 'Свернуть в лоток', 'desktop.minimizeHint': 'При сворачивании окно скрывается в область уведомлений; нажмите на значок, чтобы восстановить.',
      'desktop.close': 'Скрывать в лоток при закрытии', 'desktop.closeHint': 'Закрытие окна не завершает программу; она остаётся в лотке. Нажмите на значок, чтобы открыть окно снова.',
      'desktop.taskbar': 'Скрыть значок на панели задач', 'desktop.taskbarHint': 'Убирает окно с панели задач и из Alt+Tab; значок в лотке позволяет восстановить его.',
      'desktop.fullscreen': 'Скрыть кнопку полного экрана', 'desktop.fullscreenHint': 'Удаляет кнопку развернуть / полный экран из элементов управления окном.',
      'desktop.note': 'Параметры применяются к окну Edge в настольной версии exe. Если выключить всё, вернётся системное поведение. После скрытия в лоток программу можно полностью закрыть через меню лотка.',
      'about.desc': 'Только мониторинг наличия, без покупки',
      'about.intro': 'Разработано на основе Bili_Ticket_Monitor от TaiMiao. Отслеживает наличие билетов Bilibili на выставки, концерты и соревнования в реальном времени (без покупки). Только мониторинг наличия, без покупки и оформления заказа.',
      'about.origin': 'Оригинальный проект',
      'about.introTitle': 'О программе',
      'about.author': 'Автор', 'about.contact': 'Связаться с автором', 'about.github': 'Проект на GitHub',
      'about.data': 'Данные', 'about.dataValue': 'Открытый API Bilibili',
      'about.ui': 'Дизайн по', 'about.license': 'Лицензия',
      'about.licenseValue': 'MIT (на базе TaiMiao/Bili_Ticket_Monitor)',
      'status.ready': 'Готово', 'status.monitoring': 'Мониторинг', 'status.offline': 'Нет связи, повтор…',
      'status.tasks': 'задач: {n}',
      'toast.stopped': 'Мониторинг остановлен', 'toast.stopFailed': 'Не удалось остановить мониторинг', 'toast.added': 'Отслеживается: {name}', 'toast.addFailed': 'Не удалось добавить',
      'toast.searchFailed': 'Ошибка поиска', 'toast.allLoaded': 'Загружено событий: {n}',
      'toast.allFailed': 'Ошибка загрузки', 'toast.copied': 'Ссылка открыта',
  'toast.refreshed': 'Обновлено', 'toast.refreshFailed': 'Не удалось обновить',
    },
    de: {
      'brand.sub': 'Ticket-Monitor',
  'boot.loading': 'Oberfläche wird geweckt…', 'boot.ready': 'Bereit',
      'nav.tasks': 'Aufgaben', 'nav.new': 'Neu', 'nav.settings': 'Einstellungen', 'nav.desktop': 'Desktop', 'nav.help': 'Hilfe', 'nav.about': 'Über',
      'page.tasks.title': 'Aufgaben', 'page.tasks.sub': 'Überwachte Events und Ticketstatus',
      'page.new.title': 'Neue Aufgabe', 'page.new.sub': 'Event suchen oder alle Events durchsehen',
      'page.settings.title': 'Einstellungen', 'page.settings.sub': 'Intervall, Timeout, Bildrate, dynamische Farbe und Sprache',
      'page.help.title': 'Hilfe', 'page.help.sub': 'Updates, Anleitung und Fensterverhalten',
      'page.about.title': 'Über', 'page.about.sub': 'Ein Monitor, der nur Verfügbarkeit beobachtet',
      'stat.tasks': 'Aufgaben', 'stat.tickets': 'Tickets', 'stat.available': 'Im Verkauf', 'stat.polls': 'Anfragen',
      'task.running': 'Läuft', 'task.stop': 'Stopp', 'task.run': 'Laufzeit', 'task.req': 'Anfragen', 'task.err': 'Fehler',
      'task.upd': 'Aktualisiert', 'task.count': 'Tickets · {n} gesamt', 'task.waiting': 'Ticketdaten werden geladen…',
      'task.colRestock': 'Rückkehr', 'task.colLast': 'Zuletzt', 'task.colTotal': 'Verkaufszeit',
      'task.restockHint': 'Rückkehr = wie oft der Status „Im Verkauf“ wurde; Verkaufszeit = Gesamtdauer (die öffentliche API liefert keine Restbestände).',
      'task.onSaleNow': 'Im Verkauf',
      'time.now': 'gerade eben', 'time.sec': 'vor {n}s', 'time.min': 'vor {n} Min.', 'time.hour': 'vor {n} Std.',
      'toast.restock': '{name} ist verfügbar',
      'empty.title': 'Noch keine Aufgaben', 'empty.sub': 'Unter „Neu“ ein Event suchen und „Überwachen“ klicken', 'empty.cta': 'Neu',
      'row.id': 'ID', 'row.city': 'Stadt', 'row.date': 'Datum', 'row.sale': 'Verkauf', 'row.price': 'Preis', 'row.link': 'Details',
      'new.ph': 'Events suchen, z. B. BW2026, BML, CP31',
      'new.search': 'Suchen', 'new.all': 'Alle Events',
  'new.refresh': 'Ergebnisse aktualisieren', 'new.refreshing': 'Wird aktualisiert…',
      'new.hint': 'Nach Typ stöbern oder Stichwort suchen. „Alle Events“ lädt alles auf einmal.',
      'cat.all': 'Alle', 'cat.exhibition': 'Ausstellung', 'cat.show': 'Aufführung', 'cat.match': 'Wettbewerb',
      'cat.local': 'Lokal', 'cat.only': 'Doujin-ONLY', 'cat.nationwide': 'Landesweit',
      'new.notFound': 'Keine Events gefunden', 'new.tryAll': 'Anderes Stichwort oder alle Events probieren',
      'new.watch': 'Überwachen', 'new.adding': 'Wird hinzugefügt',
      'new.page': 'Seite {n}', 'new.pageOf': 'Seite {n} / {m}', 'new.total': '{n} Einträge',
      'new.loading': 'Suche „{q}“…', 'new.loadingAll': 'Alle Events werden geladen{extra}…',
      'new.allEmpty': 'Noch nichts geladen', 'new.allEmptyHint': 'Oben erneut „Alle Events“ klicken',
      'new.prev': 'Zurück', 'new.next': 'Weiter', 'new.loadingList': 'Liste wird geladen…',
  'new.dateHint': 'Heute richtet sich nach der Systemzeit. Wähle ein anderes Datum zum Stöbern.', 'new.dateToday': 'Heute',
  'new.dateOpen': 'Events anzeigen', 'new.dateWindowKicker': 'Datumsabfrage',
  'new.dateWindowSub': 'Events bundesweit · {n} gesamt', 'new.dateLoading': 'Events für diesen Tag werden geladen…',
  'new.dateLoadingFirst': 'Events werden gesammelt – der erste Ladevorgang dauert etwa 10 Sekunden…',
  'new.dateEmpty': 'Keine Events für diesen Tag gefunden', 'new.dateEmptyHint': 'Probiere den vorherigen / nächsten Tag oder ein anderes Datum',
  'new.dateAll': 'Alle', 'new.dateRefresh': 'Aktualisieren', 'new.dateRange': '{a} – {b}', 'new.dateOther': 'Andere',
  'new.dateUpdated': 'Aktualisiert {time}',
      'settings.interval': 'Intervall (s)', 'settings.intervalHint': 'Abstand zwischen Anfragen, ±15 % Streuung',
      'settings.timeout': 'Timeout (s)', 'settings.timeoutHint': 'Maximale Wartezeit je Anfrage',
      'settings.log': 'Protokoll schreiben', 'settings.logHint': 'Aus: keine Protokolldatei',
      'settings.language': 'Sprache', 'settings.languageHint': 'Gilt sofort',
      'settings.fps': 'UI-Bildrate', 'settings.fpsUnlimited': 'Unbegrenzte Bildrate', 'settings.fpsDetect': 'Erneut erkennen',
      'settings.fpsDetecting': 'Bildwiederholrate wird erkannt…', 'settings.fpsDetected': '{n} Hz Bildwiederholrate erkannt',
      'settings.fpsFallback': 'Bildwiederholrate nicht erkannt, verwende bis zu {n} Hz',
      'settings.fpsHint': 'Steuert die Aktualisierungsrate skriptgesteuerter UI-Animationen und Lichteffekte. Zusammengesetzte Seitenanimationen folgen weiterhin der Bildwiederholrate des Browsers. „Unbegrenzt“ deaktiviert zusätzliche Drosselung.',
      'fps.unlimited': 'Unbegrenzt', 'fps.value': '{n} fps', 'fps.max': 'Bis zu {n} Hz',
      'settings.monet': 'Dynamische Farbe (Monet)', 'settings.monetEnable': 'Aktivieren', 'settings.monetSeed': 'Ausgangsfarbe',
      'settings.monetScreen': 'Vom Bildschirm', 'settings.monetImage': 'Aus Bild',
      'settings.monetHint': 'Erzeugt mit der offiziellen Material Color Utilities aus der Ausgangsfarbe eine helle/dunkle Material-3-Expressive-Palette. Ausgeschaltet bleiben die aktuellen Farben unverändert.',
  'settings.edge': 'Kartenlicht-Farbe', 'settings.edgeRainbow': 'Regenbogen', 'settings.edgeCustom': 'Eigene Farbe',
  'settings.edgeHint': 'Regenbogen ist Standard. Wähle eine Farbe, um die Kartenränder in einen Farbverlauf dieses Tons zu ändern.',
  'settings.fontTitle': 'Oberflächen-Schrift', 'settings.fontFamily': 'Schrift', 'settings.fontSystem': 'Systemstandard',
  'settings.fontYahei': 'Microsoft YaHei', 'settings.fontSegoe': 'Segoe UI', 'settings.fontSerif': 'Serifen',
  'settings.fontMono': 'Monospace', 'settings.fontSize': 'Größe', 'settings.fontWeight': 'Stärke',
  'settings.fontRegular': 'Normal', 'settings.fontMedium': 'Mittel', 'settings.fontBold': 'Fett',
  'settings.fontHint': 'Schriftfamilie, Größe und Stärke anpassen – sofort übernommen und gespeichert.',
  'settings.fontAdd': 'Schrift hinzufügen', 'settings.fontAddHint': 'TTF / OTF / WOFF / WOFF2, bis 20 MB',
  'settings.fontCustomGroup': 'Eigene Schriften', 'settings.fontUse': 'Verwenden', 'settings.fontDelete': 'Löschen',
  'settings.fontEmpty': 'Noch keine eigene Schrift', 'settings.fontAdded': '„{name}“ hinzugefügt',
  'settings.fontAddFailed': 'Schrift konnte nicht hinzugefügt werden', 'settings.fontTooLarge': 'Schriftdatei maximal 20 MB',
  'settings.fontUnsupported': 'Nur TTF / OTF / WOFF / WOFF2 werden unterstützt', 'settings.fontDeleteFailed': 'Schrift konnte nicht gelöscht werden',
  'settings.fontRemoved': 'Schrift gelöscht',
      'settings.monetUnsupported': 'Diese Farbauswahl wird vom Browser nicht unterstützt', 'settings.monetImageFailed': 'Aus diesem Bild konnte keine Farbe extrahiert werden',
      'settings.monetAnalyzing': 'Bildfarben werden analysiert…',
      'settings.save': 'Speichern', 'settings.saved': 'Gespeichert', 'settings.failed': 'Speichern fehlgeschlagen',
      'desktop.title': 'Fensterverhalten', 'desktop.sub': 'Steuert Infobereich, Taskleiste und Fensterbuttons der Edge-App. Änderungen gelten sofort.',
      'desktop.instant': 'Sofort', 'desktop.saved': 'Angewendet',
      'desktop.minimize': 'In den Infobereich minimieren', 'desktop.minimizeHint': 'Beim Minimieren wird das Fenster in den Infobereich ausgeblendet; Klick auf das Symbol stellt es wieder her.',
      'desktop.close': 'Beim Schließen in den Infobereich', 'desktop.closeHint': 'Das Schließen beendet die App nicht; sie bleibt im Infobereich. Klick auf das Symbol öffnet das Fenster erneut.',
      'desktop.taskbar': 'Taskleisten-Symbol ausblenden', 'desktop.taskbarHint': 'Blendet das Fenster aus Taskleiste und Alt+Tab aus; das Infobereich-Symbol bleibt zum Wiederherstellen.',
      'desktop.fullscreen': 'Vollbildbutton ausblenden', 'desktop.fullscreenHint': 'Entfernt den Maximieren-/Vollbildbutton aus den Fenstersteuerungen.',
      'desktop.note': 'Diese Optionen gelten für das Edge-Fenster der Desktop-exe. Alles aus schaltet auf das Systemverhalten zurück. Nach dem Ausblenden im Infobereich kann die App über das Menü beendet werden.',
      'about.desc': 'Nur Verfügbarkeitsanzeige, kein Kauf',
      'about.intro': 'Basiert auf TaiMiaos Bili_Ticket_Monitor. Überwacht die Ticketverfügbarkeit von Bilibili für Messen, Konzerte und Wettbewerbe in Echtzeit – nur Verfügbarkeitsanzeige, kein Ticketkauf und keine Bestellung.',
      'about.origin': 'Originalprojekt',
      'about.introTitle': 'Über diese App',
      'about.author': 'Autor', 'about.contact': 'Kontakt', 'about.github': 'GitHub-Projekt',
      'about.data': 'Datenquelle', 'about.dataValue': 'Öffentliche Bilibili-API',
      'about.ui': 'UI inspiriert von', 'about.license': 'Lizenz',
      'about.licenseValue': 'MIT (basierend auf TaiMiao/Bili_Ticket_Monitor)',
      'status.ready': 'Bereit', 'status.monitoring': 'Überwacht', 'status.offline': 'Getrennt, neuer Versuch…',
      'status.tasks': '{n} Aufgaben',
      'toast.stopped': 'Überwachung beendet', 'toast.stopFailed': 'Überwachung konnte nicht beendet werden', 'toast.added': 'Wird überwacht: {name}', 'toast.addFailed': 'Hinzufügen fehlgeschlagen',
      'toast.searchFailed': 'Suche fehlgeschlagen', 'toast.allLoaded': '{n} Events geladen',
      'toast.allFailed': 'Laden fehlgeschlagen', 'toast.copied': 'Link geöffnet',
  'toast.refreshed': 'Aktualisiert', 'toast.refreshFailed': 'Aktualisierung fehlgeschlagen',
    },
    fr: {
      'brand.sub': 'Moniteur de billets',
  'boot.loading': 'Réveil de l’interface…', 'boot.ready': 'Prêt',
      'nav.tasks': 'Tâches', 'nav.new': 'Nouveau', 'nav.settings': 'Paramètres', 'nav.desktop': 'Bureau', 'nav.help': 'Aide', 'nav.about': 'À propos',
      'page.tasks.title': 'Tâches', 'page.tasks.sub': 'Événements surveillés et état des billets',
      'page.new.title': 'Nouvelle tâche', 'page.new.sub': 'Cherchez un événement ou parcourez-les tous',
      'page.settings.title': 'Paramètres', 'page.settings.sub': 'Intervalle, délai, fréquence d’image, couleur dynamique et langue',
      'page.help.title': 'Aide', 'page.help.sub': 'Mises à jour, guide et comportement de la fenêtre',
      'page.about.title': 'À propos', 'page.about.sub': 'Un moniteur qui observe seulement les places',
      'stat.tasks': 'Tâches', 'stat.tickets': 'Billets', 'stat.available': 'En vente', 'stat.polls': 'Requêtes',
      'task.running': 'En cours', 'task.stop': 'Arrêter', 'task.run': 'Durée', 'task.req': 'Requêtes', 'task.err': 'Erreurs',
      'task.upd': 'Maj', 'task.count': 'Billets · {n} au total', 'task.waiting': 'Chargement des billets…',
      'task.colRestock': 'Retours', 'task.colLast': 'Dernière', 'task.colTotal': 'Temps en vente',
      'task.restockHint': 'Retours = nombre de fois où le statut est passé à « En vente » ; Temps en vente = durée totale (l’API publique ne fournit pas les stocks).',
      'task.onSaleNow': 'En vente',
      'time.now': 'à l’instant', 'time.sec': 'il y a {n}s', 'time.min': 'il y a {n} min', 'time.hour': 'il y a {n} h',
      'toast.restock': '{name} est en vente',
      'empty.title': 'Aucune tâche', 'empty.sub': 'Ouvrez « Nouveau », cherchez un événement et cliquez sur « Surveiller »', 'empty.cta': 'Nouvelle tâche',
      'row.id': 'ID', 'row.city': 'Ville', 'row.date': 'Date', 'row.sale': 'Vente', 'row.price': 'Prix', 'row.link': 'Détails',
      'new.ph': 'Rechercher un événement, ex. BW2026, BML, CP31',
      'new.search': 'Rechercher', 'new.all': 'Tous les événements',
  'new.refresh': 'Actualiser les résultats', 'new.refreshing': 'Actualisation…',
      'new.hint': 'Parcourez par type ou cherchez un mot-clé. « Tous les événements » charge tout d’un coup.',
      'cat.all': 'Tous', 'cat.exhibition': 'Exposition', 'cat.show': 'Spectacle', 'cat.match': 'Compétition',
      'cat.local': 'Local', 'cat.only': 'Doujin ONLY', 'cat.nationwide': 'Tout le pays',
      'new.notFound': 'Aucun événement trouvé', 'new.tryAll': 'Essayez un autre mot-clé ou tous les événements',
      'new.watch': 'Surveiller', 'new.adding': 'Ajout',
      'new.page': 'Page {n}', 'new.pageOf': 'Page {n} / {m}', 'new.total': '{n} éléments',
      'new.loading': 'Recherche de « {q} »…', 'new.loadingAll': 'Chargement de tous les événements{extra}…',
      'new.allEmpty': 'Rien de chargé', 'new.allEmptyHint': 'Cliquez de nouveau sur « Tous les événements »',
      'new.prev': 'Préc.', 'new.next': 'Suiv.', 'new.loadingList': 'Chargement de la liste…',
  'new.dateHint': 'Aujourd’hui suit l’heure du système. Choisissez une autre date pour explorer.', 'new.dateToday': 'Aujourd’hui',
  'new.dateOpen': 'Voir les événements', 'new.dateWindowKicker': 'Recherche par date',
  'new.dateWindowSub': 'Événements nationaux · {n} au total', 'new.dateLoading': 'Chargement des événements de ce jour…',
  'new.dateLoadingFirst': 'Collecte des événements nationaux — le premier chargement prend environ 10 secondes…',
  'new.dateEmpty': 'Aucun événement trouvé pour ce jour', 'new.dateEmptyHint': 'Essayez la veille / le lendemain ou une autre date',
  'new.dateAll': 'Tous', 'new.dateRefresh': 'Actualiser', 'new.dateRange': '{a} – {b}', 'new.dateOther': 'Autre',
  'new.dateUpdated': 'Mis à jour {time}',
      'settings.interval': 'Intervalle (s)', 'settings.intervalHint': 'Délai entre requêtes, ±15 % aléatoire',
      'settings.timeout': 'Délai d’attente (s)', 'settings.timeoutHint': 'Attente maximale par requête',
      'settings.log': 'Écrire un journal', 'settings.logHint': 'Désactivé : aucun fichier',
      'settings.language': 'Langue', 'settings.languageHint': 'Appliqué immédiatement',
      'settings.fps': 'Fréquence d’image de l’interface', 'settings.fpsUnlimited': 'Fréquence d’image illimitée', 'settings.fpsDetect': 'Redétecter',
      'settings.fpsDetecting': 'Détection de la fréquence de rafraîchissement…', 'settings.fpsDetected': 'Fréquence de rafraîchissement détectée : {n} Hz',
      'settings.fpsFallback': 'Fréquence non détectée, utilisation jusqu’à {n} Hz',
      'settings.fpsHint': 'Contrôle la fréquence de mise à jour des animations scriptées et des effets lumineux. Les animations composées de la page suivent toujours la fréquence de l’écran. « Illimité » désactive tout throttling supplémentaire.',
      'fps.unlimited': 'Illimité', 'fps.value': '{n} fps', 'fps.max': 'Jusqu’à {n} Hz',
      'settings.monet': 'Couleur dynamique (Monet)', 'settings.monetEnable': 'Activer', 'settings.monetSeed': 'Couleur source',
      'settings.monetScreen': 'Prendre à l’écran', 'settings.monetImage': 'Prendre dans une image',
      'settings.monetHint': 'Génère une palette Material 3 Expressive claire/sombre à partir de la couleur source avec la bibliothèque officielle Material Color Utilities. Désactivé, les couleurs actuelles restent inchangées.',
  'settings.edge': 'Couleur de lueur des cartes', 'settings.edgeRainbow': 'Arc-en-ciel', 'settings.edgeCustom': 'Personnalisée',
  'settings.edgeHint': 'L’arc-en-ciel est la valeur par défaut. Choisissez une couleur pour teinter les bords des cartes d’un dégradé de cette teinte.',
  'settings.fontTitle': 'Police de l’interface', 'settings.fontFamily': 'Police', 'settings.fontSystem': 'Système',
  'settings.fontYahei': 'Microsoft YaHei', 'settings.fontSegoe': 'Segoe UI', 'settings.fontSerif': 'Serif',
  'settings.fontMono': 'Monospace', 'settings.fontSize': 'Taille', 'settings.fontWeight': 'Graisse',
  'settings.fontRegular': 'Normal', 'settings.fontMedium': 'Moyen', 'settings.fontBold': 'Gras',
  'settings.fontHint': 'Ajustez la famille, la taille et la graisse ; appliqué immédiatement et mémorisé.',
  'settings.fontAdd': 'Ajouter une police', 'settings.fontAddHint': 'TTF / OTF / WOFF / WOFF2, 20 Mo max',
  'settings.fontCustomGroup': 'Polices personnalisées', 'settings.fontUse': 'Utiliser', 'settings.fontDelete': 'Supprimer',
  'settings.fontEmpty': 'Aucune police ajoutée', 'settings.fontAdded': '« {name} » ajoutée',
  'settings.fontAddFailed': 'Impossible d’ajouter la police', 'settings.fontTooLarge': 'La police doit faire 20 Mo maximum',
  'settings.fontUnsupported': 'Seuls TTF / OTF / WOFF / WOFF2 sont pris en charge', 'settings.fontDeleteFailed': 'Impossible de supprimer la police',
  'settings.fontRemoved': 'Police supprimée',
      'settings.monetUnsupported': 'Ce sélecteur de couleur n’est pas pris en charge par le navigateur', 'settings.monetImageFailed': 'Impossible d’extraire une couleur de cette image',
      'settings.monetAnalyzing': 'Analyse des couleurs de l’image…',
      'settings.save': 'Enregistrer', 'settings.saved': 'Enregistré', 'settings.failed': 'Échec de l’enregistrement',
      'desktop.title': 'Comportement de la fenêtre', 'desktop.sub': 'Contrôle la zone de notification, la barre des tâches et les boutons de la fenêtre Edge. Les changements s’appliquent immédiatement.',
      'desktop.instant': 'Immédiat', 'desktop.saved': 'Appliqué',
      'desktop.minimize': 'Réduire dans la zone de notification', 'desktop.minimizeHint': 'Lors de la réduction, la fenêtre est masquée dans la zone de notification ; cliquez sur l’icône pour la restaurer.',
      'desktop.close': 'Masquer dans la zone de notification à la fermeture', 'desktop.closeHint': 'Fermer la fenêtre n’arrête pas l’application ; elle reste dans la zone de notification. Cliquez sur l’icône pour rouvrir la fenêtre.',
      'desktop.taskbar': 'Masquer l’icône de la barre des tâches', 'desktop.taskbarHint': 'Retire la fenêtre de la barre des tâches et d’Alt+Tab ; l’icône de notification permet de la restaurer.',
      'desktop.fullscreen': 'Masquer le bouton plein écran', 'desktop.fullscreenHint': 'Retire le bouton agrandir / plein écran des contrôles de la fenêtre.',
      'desktop.note': 'Ces options s’appliquent à la fenêtre Edge de l’exe. Tout désactiver restaure le comportement système. Une fois masquée dans la zone de notification, l’application peut être quittée depuis son menu.',
      'about.desc': 'Surveillance uniquement, aucune réservation',
      'about.intro': 'Basé sur Bili_Ticket_Monitor de TaiMiao. Surveille en temps réel les billets Bilibili pour les conventions, concerts et compétitions — surveillance uniquement, sans achat ni réservation.',
      'about.origin': 'Projet d’origine',
      'about.introTitle': 'À propos de l’application',
      'about.author': 'Auteur', 'about.contact': 'Contact', 'about.github': 'Projet GitHub',
      'about.data': 'Source', 'about.dataValue': 'API publique Bilibili',
      'about.ui': 'UI inspirée de', 'about.license': 'Licence',
      'about.licenseValue': 'MIT (basé sur TaiMiao/Bili_Ticket_Monitor)',
      'status.ready': 'Prêt', 'status.monitoring': 'Surveillance', 'status.offline': 'Déconnecté, nouvelle tentative…',
      'status.tasks': '{n} tâches',
      'toast.stopped': 'Surveillance arrêtée', 'toast.stopFailed': 'Impossible d’arrêter la surveillance', 'toast.added': 'Surveillance : {name}', 'toast.addFailed': 'Ajout impossible',
      'toast.searchFailed': 'Recherche échouée', 'toast.allLoaded': '{n} événements chargés',
      'toast.allFailed': 'Chargement échoué', 'toast.copied': 'Lien ouvert',
  'toast.refreshed': 'Actualisé', 'toast.refreshFailed': 'Échec de l’actualisation',
    },
  };


  const EXTRA_I18N = {
    'zh-CN': {
      'settings.notifyTitle': '提醒弹窗', 'settings.notifyNew': '新活动提醒', 'settings.notifySale': '开票提醒',
      'settings.notifyHint': '关注城市出现新活动，或监控的票种开始可购时，在窗口角落弹出提醒；位置和停留时间对两种提醒都生效。',
      'settings.notifyCity': '关注城市', 'settings.notifyPos': '弹窗位置', 'settings.notifyDuration': '停留时间',
      'settings.notifyPreview': '预览弹窗', 'settings.notifyTestSent': '已发送预览提醒',
      'settings.motion': '动画效果', 'settings.motionFull': '完整', 'settings.motionSoft': '柔和',
      'settings.motionLite': '精简', 'settings.motionOff': '关闭',
      'settings.motionHint': '控制启动动画、卡片流光、页面切换与弹窗动效的强度；关闭后界面保留颜色与状态，不再播放动画。',
      'task.colPrice': '价格', 'task.buy': '购票',
      'new.pageJump': '跳转页码', 'new.pageFirst': '首页', 'new.pageLast': '末页', 'new.pageGo': '前往',
      'new.pageUnknown': '接口未返回总页数，已跳到第 {n} 页', 'new.pageProbing': '正在探测最后一页…',
      'new.pageTotalHint': '共 {n} 页', 'new.pageLimitHint': '已加载 {n} 页',
      'notify.newTitle': '{city} 有新活动', 'notify.saleTitle': '{name} 开票了',
      'notify.newTag': '新活动', 'notify.saleTag': '开票', 'notify.detail': '查看详情', 'notify.watch': '监控',
      'notify.close': '关闭提醒', 'notify.more': '还有 {n} 条提醒', 'notify.price': '票价',
      'toast.notifyPreviewFailed': '预览发送失败',
    },
    'zh-TW': {
      'settings.notifyTitle': '提醒彈窗', 'settings.notifyNew': '新活動提醒', 'settings.notifySale': '開票提醒',
      'settings.notifyHint': '關注城市出現新活動，或監控的票種開始可購時，在視窗角落彈出提醒；位置和停留時間對兩種提醒都生效。',
      'settings.notifyCity': '關注城市', 'settings.notifyPos': '彈窗位置', 'settings.notifyDuration': '停留時間',
      'settings.notifyPreview': '預覽彈窗', 'settings.notifyTestSent': '已發送預覽提醒',
      'settings.motion': '動畫效果', 'settings.motionFull': '完整', 'settings.motionSoft': '柔和',
      'settings.motionLite': '精簡', 'settings.motionOff': '關閉',
      'settings.motionHint': '控制啟動動畫、卡片流光、頁面切換與彈窗動效的強度；關閉後介面保留顏色與狀態，不再播放動畫。',
      'task.colPrice': '價格', 'task.buy': '購票',
      'new.pageJump': '跳轉頁碼', 'new.pageFirst': '首頁', 'new.pageLast': '末頁', 'new.pageGo': '前往',
      'new.pageUnknown': '介面未回傳總頁數，已跳到第 {n} 頁', 'new.pageProbing': '正在探測最後一頁…',
      'new.pageTotalHint': '共 {n} 頁', 'new.pageLimitHint': '已載入 {n} 頁',
      'notify.newTitle': '{city} 有新活動', 'notify.saleTitle': '{name} 開票了',
      'notify.newTag': '新活動', 'notify.saleTag': '開票', 'notify.detail': '查看詳情', 'notify.watch': '監控',
      'notify.close': '關閉提醒', 'notify.more': '還有 {n} 條提醒', 'notify.price': '票價',
      'toast.notifyPreviewFailed': '預覽發送失敗',
    },
    en: {
      'settings.notifyTitle': 'Notifications', 'settings.notifyNew': 'New events', 'settings.notifySale': 'Ticket sale alerts',
      'settings.notifyHint': 'Show a popup when a new event appears in your city, or a watched ticket becomes available. Position and duration apply to both.',
      'settings.notifyCity': 'City', 'settings.notifyPos': 'Position', 'settings.notifyDuration': 'Duration',
      'settings.notifyPreview': 'Preview', 'settings.notifyTestSent': 'Preview notification sent',
      'settings.motion': 'Motion', 'settings.motionFull': 'Full', 'settings.motionSoft': 'Soft',
      'settings.motionLite': 'Lite', 'settings.motionOff': 'Off',
      'settings.motionHint': 'Controls launch animation, card light edges, page transitions and popups. Off keeps colors and states without animation.',
      'task.colPrice': 'Price', 'task.buy': 'Buy',
      'new.pageJump': 'Jump to page', 'new.pageFirst': 'First', 'new.pageLast': 'Last', 'new.pageGo': 'Go',
      'new.pageUnknown': 'The API returned no page count; jumped to page {n}', 'new.pageProbing': 'Finding last page…',
      'new.pageTotalHint': '{n} pages', 'new.pageLimitHint': '{n} pages loaded',
      'notify.newTitle': 'New event in {city}', 'notify.saleTitle': '{name} is on sale',
      'notify.newTag': 'New', 'notify.saleTag': 'On sale', 'notify.detail': 'Details', 'notify.watch': 'Watch',
      'notify.close': 'Dismiss', 'notify.more': '{n} more notifications', 'notify.price': 'Price',
      'toast.notifyPreviewFailed': 'Could not send preview',
    },
    ja: {
      'settings.notifyTitle': '通知ポップアップ', 'settings.notifyNew': '新着イベント', 'settings.notifySale': '販売開始',
      'settings.notifyHint': '注目都市に新しいイベントが出たとき、または監視チケットが購入可能になったときにポップアップします。位置と表示時間は両方に適用されます。',
      'settings.notifyCity': '注目都市', 'settings.notifyPos': '表示位置', 'settings.notifyDuration': '表示時間',
      'settings.notifyPreview': 'プレビュー', 'settings.notifyTestSent': 'プレビューを送信しました',
      'settings.motion': 'アニメーション', 'settings.motionFull': 'フル', 'settings.motionSoft': 'ソフト',
      'settings.motionLite': '軽量', 'settings.motionOff': 'オフ',
      'settings.motionHint': '起動アニメーション、カードの光、ページ切替、ポップアップの強さを調整します。オフでも色と状態は保持されます。',
      'task.colPrice': '価格', 'task.buy': '購入',
      'new.pageJump': 'ページ移動', 'new.pageFirst': '最初', 'new.pageLast': '最後', 'new.pageGo': '移動',
      'new.pageUnknown': 'API が総ページ数を返さないため、{n} ページへ移動しました', 'new.pageProbing': '最終ページを検索中…',
      'new.pageTotalHint': '全 {n} ページ', 'new.pageLimitHint': '{n} ページ読み込み済み',
      'notify.newTitle': '{city} に新着イベント', 'notify.saleTitle': '{name} が販売開始',
      'notify.newTag': '新着', 'notify.saleTag': '販売中', 'notify.detail': '詳細', 'notify.watch': '監視',
      'notify.close': '閉じる', 'notify.more': '他 {n} 件', 'notify.price': '価格',
      'toast.notifyPreviewFailed': 'プレビューを送信できませんでした',
    },
    ko: {
      'settings.notifyTitle': '알림 팝업', 'settings.notifyNew': '새 행사 알림', 'settings.notifySale': '판매 시작 알림',
      'settings.notifyHint': '관심 도시에 새 행사가 생기거나 감시 중인 티켓이 구매 가능해지면 팝업으로 알려 줍니다. 위치와 표시 시간은 두 알림에 모두 적용됩니다.',
      'settings.notifyCity': '관심 도시', 'settings.notifyPos': '팝업 위치', 'settings.notifyDuration': '표시 시간',
      'settings.notifyPreview': '미리보기', 'settings.notifyTestSent': '미리보기 알림을 보냈습니다',
      'settings.motion': '애니메이션', 'settings.motionFull': '전체', 'settings.motionSoft': '부드럽게',
      'settings.motionLite': '간단히', 'settings.motionOff': '끄기',
      'settings.motionHint': '시작 애니메이션, 카드 빛, 페이지 전환, 팝업 효과의 강도를 조절합니다. 끄면 색과 상태만 유지됩니다.',
      'task.colPrice': '가격', 'task.buy': '구매',
      'new.pageJump': '페이지 이동', 'new.pageFirst': '처음', 'new.pageLast': '마지막', 'new.pageGo': '이동',
      'new.pageUnknown': 'API가 전체 페이지 수를 주지 않아 {n} 페이지로 이동했습니다', 'new.pageProbing': '마지막 페이지 확인 중…',
      'new.pageTotalHint': '총 {n} 페이지', 'new.pageLimitHint': '{n} 페이지 로드됨',
      'notify.newTitle': '{city} 새 행사', 'notify.saleTitle': '{name} 판매 시작',
      'notify.newTag': '새 행사', 'notify.saleTag': '판매 중', 'notify.detail': '상세', 'notify.watch': '감시',
      'notify.close': '닫기', 'notify.more': '{n}개 더 있음', 'notify.price': '가격',
      'toast.notifyPreviewFailed': '미리보기를 보내지 못했습니다',
    },
    ru: {
      'settings.notifyTitle': 'Уведомления', 'settings.notifyNew': 'Новые события', 'settings.notifySale': 'Старт продаж',
      'settings.notifyHint': 'Показывать всплывающее уведомление о новом событии в выбранном городе или о поступлении билетов. Позиция и длительность действуют для обоих типов.',
      'settings.notifyCity': 'Город', 'settings.notifyPos': 'Позиция', 'settings.notifyDuration': 'Длительность',
      'settings.notifyPreview': 'Просмотр', 'settings.notifyTestSent': 'Пробное уведомление отправлено',
      'settings.motion': 'Анимация', 'settings.motionFull': 'Полная', 'settings.motionSoft': 'Мягкая',
      'settings.motionLite': 'Минимальная', 'settings.motionOff': 'Выкл.',
      'settings.motionHint': 'Управляет анимацией запуска, свечением карточек, переходами страниц и всплывающими окнами. При выключении цвета и состояния сохраняются.',
      'task.colPrice': 'Цена', 'task.buy': 'Купить',
      'new.pageJump': 'Перейти на страницу', 'new.pageFirst': 'Первая', 'new.pageLast': 'Последняя', 'new.pageGo': 'Перейти',
      'new.pageUnknown': 'API не вернул число страниц; выполнен переход на страницу {n}', 'new.pageProbing': 'Поиск последней страницы…',
      'new.pageTotalHint': 'Всего {n} стр.', 'new.pageLimitHint': 'Загружено {n} стр.',
      'notify.newTitle': 'Новое событие в {city}', 'notify.saleTitle': '{name}: продажи открыты',
      'notify.newTag': 'Новое', 'notify.saleTag': 'В продаже', 'notify.detail': 'Подробнее', 'notify.watch': 'Следить',
      'notify.close': 'Закрыть', 'notify.more': 'Ещё {n}', 'notify.price': 'Цена',
      'toast.notifyPreviewFailed': 'Не удалось отправить просмотр',
    },
    de: {
      'settings.notifyTitle': 'Benachrichtigungen', 'settings.notifyNew': 'Neue Events', 'settings.notifySale': 'Vorverkauf',
      'settings.notifyHint': 'Zeigt ein Popup, wenn in der Stadt ein neues Event erscheint oder ein beobachtetes Ticket verfügbar wird. Position und Dauer gelten für beide.',
      'settings.notifyCity': 'Stadt', 'settings.notifyPos': 'Position', 'settings.notifyDuration': 'Dauer',
      'settings.notifyPreview': 'Vorschau', 'settings.notifyTestSent': 'Vorschau gesendet',
      'settings.motion': 'Animation', 'settings.motionFull': 'Voll', 'settings.motionSoft': 'Sanft',
      'settings.motionLite': 'Reduziert', 'settings.motionOff': 'Aus',
      'settings.motionHint': 'Steuert Startanimation, Kartenlicht, Seitenwechsel und Popups. Bei „Aus“ bleiben Farben und Zustände erhalten.',
      'task.colPrice': 'Preis', 'task.buy': 'Kaufen',
      'new.pageJump': 'Seite wählen', 'new.pageFirst': 'Erste', 'new.pageLast': 'Letzte', 'new.pageGo': 'Los',
      'new.pageUnknown': 'Die API lieferte keine Seitenzahl; zu Seite {n} gesprungen', 'new.pageProbing': 'Letzte Seite wird gesucht…',
      'new.pageTotalHint': '{n} Seiten', 'new.pageLimitHint': '{n} Seiten geladen',
      'notify.newTitle': 'Neues Event in {city}', 'notify.saleTitle': '{name} ist im Verkauf',
      'notify.newTag': 'Neu', 'notify.saleTag': 'Im Verkauf', 'notify.detail': 'Details', 'notify.watch': 'Beobachten',
      'notify.close': 'Schließen', 'notify.more': 'Noch {n}', 'notify.price': 'Preis',
      'toast.notifyPreviewFailed': 'Vorschau konnte nicht gesendet werden',
    },
    fr: {
      'settings.notifyTitle': 'Notifications', 'settings.notifyNew': 'Nouveaux événements', 'settings.notifySale': 'Ouverture des ventes',
      'settings.notifyHint': 'Affiche une notification quand un nouvel événement apparaît dans la ville ou qu’un billet surveillé devient disponible. Position et durée s’appliquent aux deux.',
      'settings.notifyCity': 'Ville', 'settings.notifyPos': 'Position', 'settings.notifyDuration': 'Durée',
      'settings.notifyPreview': 'Aperçu', 'settings.notifyTestSent': 'Aperçu envoyé',
      'settings.motion': 'Animation', 'settings.motionFull': 'Complète', 'settings.motionSoft': 'Douce',
      'settings.motionLite': 'Réduite', 'settings.motionOff': 'Désactivée',
      'settings.motionHint': 'Contrôle l’animation de démarrage, le halo des cartes, les transitions et les popups. Désactivée, les couleurs et états restent visibles.',
      'task.colPrice': 'Prix', 'task.buy': 'Acheter',
      'new.pageJump': 'Aller à la page', 'new.pageFirst': 'Première', 'new.pageLast': 'Dernière', 'new.pageGo': 'Aller',
      'new.pageUnknown': 'L’API ne renvoie pas le nombre de pages ; page {n} affichée', 'new.pageProbing': 'Recherche de la dernière page…',
      'new.pageTotalHint': '{n} pages', 'new.pageLimitHint': '{n} pages chargées',
      'notify.newTitle': 'Nouvel événement à {city}', 'notify.saleTitle': '{name} est en vente',
      'notify.newTag': 'Nouveau', 'notify.saleTag': 'En vente', 'notify.detail': 'Détails', 'notify.watch': 'Surveiller',
      'notify.close': 'Fermer', 'notify.more': 'Encore {n}', 'notify.price': 'Prix',
      'toast.notifyPreviewFailed': 'Impossible d’envoyer l’aperçu',
    },
  };
  for (const [lang, dict] of Object.entries(EXTRA_I18N)) {
    I18N[lang] = Object.assign(I18N[lang] || {}, dict);
  }


  const EXTRA_I18N_POS = {
    'zh-CN': { 'pos.tl': '左上角', 'pos.tr': '右上角', 'pos.bl': '左下角', 'pos.br': '右下角', 'pos.island': '灵动岛' },
    'zh-TW': { 'pos.tl': '左上角', 'pos.tr': '右上角', 'pos.bl': '左下角', 'pos.br': '右下角', 'pos.island': '靈動島' },
    en: { 'pos.tl': 'Top left', 'pos.tr': 'Top right', 'pos.bl': 'Bottom left', 'pos.br': 'Bottom right', 'pos.island': 'Dynamic island' },
    ja: { 'pos.tl': '左上', 'pos.tr': '右上', 'pos.bl': '左下', 'pos.br': '右下', 'pos.island': 'ダイナミックアイランド' },
    ko: { 'pos.tl': '왼쪽 위', 'pos.tr': '오른쪽 위', 'pos.bl': '왼쪽 아래', 'pos.br': '오른쪽 아래', 'pos.island': '다이내믹 아일랜드' },
    ru: { 'pos.tl': 'Слева сверху', 'pos.tr': 'Справа сверху', 'pos.bl': 'Слева снизу', 'pos.br': 'Справа снизу', 'pos.island': 'Dynamic Island' },
    de: { 'pos.tl': 'Oben links', 'pos.tr': 'Oben rechts', 'pos.bl': 'Unten links', 'pos.br': 'Unten rechts', 'pos.island': 'Dynamic Island' },
    fr: { 'pos.tl': 'En haut à gauche', 'pos.tr': 'En haut à droite', 'pos.bl': 'En bas à gauche', 'pos.br': 'En bas à droite', 'pos.island': 'Dynamic Island' },
  };
  for (const [lang, dict] of Object.entries(EXTRA_I18N_POS)) {
    I18N[lang] = Object.assign(I18N[lang] || {}, dict);
  }


  const EXTRA_I18N_DUR = {
    'zh-CN': { 'settings.notifyDurationValue': '{n} 秒' },
    'zh-TW': { 'settings.notifyDurationValue': '{n} 秒' },
    en: { 'settings.notifyDurationValue': '{n}s' },
    ja: { 'settings.notifyDurationValue': '{n} 秒' },
    ko: { 'settings.notifyDurationValue': '{n}초' },
    ru: { 'settings.notifyDurationValue': '{n} с' },
    de: { 'settings.notifyDurationValue': '{n} s' },
    fr: { 'settings.notifyDurationValue': '{n} s' },
  };
  for (const [lang, dict] of Object.entries(EXTRA_I18N_DUR)) {
    I18N[lang] = Object.assign(I18N[lang] || {}, dict);
  }


  const EXTRA_I18N_CITY = {
    'zh-CN': { 'city.title': '选择城市', 'city.search': '搜索城市或拼音首字母', 'city.foot': '选择后立即刷新列表', 'city.empty': '没有匹配的城市', 'city.count': '{n} 个城市' },
    'zh-TW': { 'city.title': '選擇城市', 'city.search': '搜尋城市或拼音首字母', 'city.foot': '選擇後立即重新整理列表', 'city.empty': '沒有符合的城市', 'city.count': '{n} 個城市' },
    en: { 'city.title': 'Choose a city', 'city.search': 'Search city or initial', 'city.foot': 'Results refresh immediately', 'city.empty': 'No matching city', 'city.count': '{n} cities' },
    ja: { 'city.title': '都市を選択', 'city.search': '都市名または頭文字で検索', 'city.foot': '選択するとすぐに更新されます', 'city.empty': '一致する都市がありません', 'city.count': '{n} 都市' },
    ko: { 'city.title': '도시 선택', 'city.search': '도시 또는 첫 글자 검색', 'city.foot': '선택하면 바로 새로 고칩니다', 'city.empty': '일치하는 도시가 없습니다', 'city.count': '도시 {n}개' },
    ru: { 'city.title': 'Выбор города', 'city.search': 'Поиск города или первой буквы', 'city.foot': 'Список обновится сразу', 'city.empty': 'Город не найден', 'city.count': 'Городов: {n}' },
    de: { 'city.title': 'Stadt wählen', 'city.search': 'Stadt oder Anfangsbuchstabe suchen', 'city.foot': 'Liste wird sofort aktualisiert', 'city.empty': 'Keine passende Stadt', 'city.count': '{n} Städte' },
    fr: { 'city.title': 'Choisir une ville', 'city.search': 'Rechercher une ville ou une initiale', 'city.foot': 'La liste se met à jour aussitôt', 'city.empty': 'Aucune ville correspondante', 'city.count': '{n} villes' },
  };
  for (const [lang, dict] of Object.entries(EXTRA_I18N_CITY)) {
    I18N[lang] = Object.assign(I18N[lang] || {}, dict);
  }

  const LANGS = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'ru', 'de', 'fr'];

  // 接口返回的中文状态 → 各语言显示
  const STATUS_I18N = {
    'zh-CN': {},
    'zh-TW': {
      预售中: '預售中', 暂时售罄: '暫時售罄', 已售罄: '已售罄', 已停售: '已停售',
      未开售: '未開售', 不可售: '不可售', 已结束: '已結束', 未知: '未知',
    },
    en: {
      预售中: 'On sale', 暂时售罄: 'Temporarily sold out', 已售罄: 'Sold out', 已停售: 'Sales ended',
      未开售: 'Not on sale', 不可售: 'Unavailable', 已结束: 'Ended', 未知: 'Unknown',
    },
    ja: {
      预售中: '販売中', 暂时售罄: '一時完売', 已售罄: '完売', 已停售: '販売終了',
      未开售: '販売前', 不可售: '販売不可', 已结束: '終了', 未知: '不明',
    },
    ko: {
      预售中: '판매 중', 暂时售罄: '일시 매진', 已售罄: '매진', 已停售: '판매 종료',
      未开售: '판매 전', 不可售: '판매 불가', 已结束: '종료', 未知: '알 수 없음',
    },
    ru: {
      预售中: 'В продаже', 暂时售罄: 'Временно нет', 已售罄: 'Распродано', 已停售: 'Продажи закрыты',
      未开售: 'Ещё не в продаже', 不可售: 'Недоступно', 已结束: 'Завершено', 未知: 'Неизвестно',
    },
    de: {
      预售中: 'Im Verkauf', 暂时售罄: 'Kurzzeitig ausverkauft', 已售罄: 'Ausverkauft', 已停售: 'Verkauf beendet',
      未开售: 'Noch nicht im Verkauf', 不可售: 'Nicht verfügbar', 已结束: 'Beendet', 未知: 'Unbekannt',
    },
    fr: {
      预售中: 'En vente', 暂时售罄: 'Temporairement épuisé', 已售罄: 'Épuisé', 已停售: 'Vente terminée',
      未开售: 'Pas encore en vente', 不可售: 'Indisponible', 已结束: 'Terminé', 未知: 'Inconnu',
    },
  };

  const statusLabel = (status) => (STATUS_I18N[state.lang] && STATUS_I18N[state.lang][status]) || status;

  const CHANGE_I18N = {
    'zh-CN': {}, 'zh-TW': { 新增: '新增', 状态变化: '狀態變化', 移除: '移除' },
    en: { 新增: 'Added', 状态变化: 'Status changed', 移除: 'Removed' },
    ja: { 新增: '追加', 状态变化: '状態変更', 移除: '削除' },
    ko: { 新增: '추가', 状态变化: '상태 변경', 移除: '제거' },
    ru: { 新增: 'Добавлено', 状态变化: 'Статус изменён', 移除: 'Удалено' },
    de: { 新增: 'Hinzugefügt', 状态变化: 'Status geändert', 移除: 'Entfernt' },
    fr: { 新增: 'Ajouté', 状态变化: 'Statut modifié', 移除: 'Retiré' },
  };

  const changeLabel = (kind) => (CHANGE_I18N[state.lang] && CHANGE_I18N[state.lang][kind]) || kind;

  const state = {
    view: 'tasks',
    lang: localStorage.getItem('iqx.lang') || 'zh-CN',
    settings: {
      interval: 2,
      timeout: 10,
      log: false,
      theme: 'system',
      language: 'zh-CN',
      fps: 60,
      fpsUnlimited: true,
      fpsMax: 600,
      monet: false,
      monetSeed: '#0a84ff',
      edgeColor: 'rainbow',
      fontFamily: 'system',
      fontSize: 14,
      fontWeight: 400,
      desktopMinimizeToTray: false,
      desktopCloseToTray: false,
      desktopHideTaskbar: false,
      desktopHideFullscreen: false,
      notifyNew: true,
      notifySale: true,
      notifyCity: 0,
      notifyPos: 'br',
      notifyDuration: 6000,
      motion: 'full',
    },
    fpsMax: 0,
    fpsState: 'idle',
    fpsDirty: false,
    monetDirty: false,
    edgeDirty: false,
    fontDirty: false,
    desktopPending: new Set(),
    tasks: [],
    mode: 'none', // search | all | list | none
    search: { keyword: '', page: 1, items: [], loading: false },
    list: { type: '', area: 0, page: 1, items: [], loading: false },
    all: { items: [], page: 1, loading: false, running: false },
    date: '',
    dateTab: 'all',
    dateCache: new Map(),
    dateToken: 0,
    datePicker: { open: false, anchor: '', month: '' },
    pagePicker: { open: false },
    cities: [],
    cityArea: 0,
    cityName: '',
    cityPicker: { open: false, filter: '', openedAt: 0 },
    notifications: { cursor: 0, ready: false, active: 0, pending: [] },
    fonts: [],
    meta: null,
    online: true,
  };

  const PAGE_SIZE = 16;
  const MOTION_QUERY = window.matchMedia('(prefers-reduced-motion: reduce)');
  const THEMES = ['light', 'system', 'dark'];
  const COMMON_REFRESH_RATES = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240, 360, 480, 500, 540, 600];
  const viewScroll = { tasks: 0, new: 0, settings: 0, desktop: 0, help: 0, about: 0 };
  const DATE_TABS = ['all', '展览', '演出', '赛事', '同人展', '其他'];
  const DATE_CAT_KEY = {
    all: 'new.dateAll',
    展览: 'cat.exhibition',
    演出: 'cat.show',
    赛事: 'cat.match',
    同人展: 'cat.only',
    本地生活: 'cat.local',
    其他: 'new.dateOther',
  };
  let bootDismissed = false;
  let fpsDetectPromise = null;

  const MOTION_RANK = { off: 0, lite: 1, soft: 2, full: 3 };
  const motionLevel = () => (state.settings && state.settings.motion) || 'full';
  const motionRank = () => MOTION_RANK[motionLevel()] ?? 3;
  const motionAtLeast = (level) => !MOTION_QUERY.matches && motionRank() >= (MOTION_RANK[level] ?? 3);
  const motionOK = () => motionAtLeast('soft');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 脚本动画的帧调度器：CSS 合成动画由浏览器控制，这里限制 JS 驱动的光效/数字/滚动反馈。
  const frameGate = { limit: 0, last: 0, jobs: new Set(), raf: 0, pumping: false };

  function pumpFrame(now) {
    frameGate.raf = 0;
    if (frameGate.limit > 0) {
      const interval = 1000 / frameGate.limit;
      if (frameGate.last && now - frameGate.last < interval - 0.5) {
        frameGate.raf = requestAnimationFrame(pumpFrame);
        return;
      }
      frameGate.last = now;
    } else {
      frameGate.last = now;
    }

    frameGate.pumping = true;
    try {
      const jobs = [...frameGate.jobs];
      frameGate.jobs.clear();
      for (const job of jobs) {
        if (job.cancelled) continue;
        try {
          job.cb(now);
        } catch (err) {
          console.error(err);
        }
      }
    } finally {
      frameGate.pumping = false;
      if (frameGate.jobs.size && !frameGate.raf) {
        frameGate.raf = requestAnimationFrame(pumpFrame);
      }
    }
  }

  function requestUiFrame(callback) {
    const job = { cb: callback, cancelled: false };
    frameGate.jobs.add(job);
    if (!frameGate.raf && !frameGate.pumping) frameGate.raf = requestAnimationFrame(pumpFrame);
    return () => {
      job.cancelled = true;
      frameGate.jobs.delete(job);
    };
  }

  function clampFps(value, max) {
    const upper = Math.max(30, Math.min(600, Math.round(Number(max) || 60)));
    return Math.max(30, Math.min(upper, Math.round(Number(value) || upper)));
  }

  function currentFpsLimit() {
    if (state.settings.fpsUnlimited) return 0;
    return clampFps(state.settings.fps, state.fpsMax || state.settings.fpsMax || 60);
  }

  function applyFpsLimit() {
    frameGate.limit = currentFpsLimit();
    frameGate.last = 0;
    document.documentElement.dataset.fps = state.settings.fpsUnlimited ? 'unlimited' : String(frameGate.limit);
  }

  function updateFpsUI(pop = false) {
    const slider = $('set-fps');
    const readout = $('fps-readout');
    const unlimitedBox = $('set-fps-unlimited');
    const field = $('fps-field');
    if (!slider || !readout) return;

    const max = Math.max(30, Math.min(600, Math.round(Number(state.fpsMax || state.settings.fpsMax) || 60)));
    state.settings.fpsMax = max;
    state.settings.fps = clampFps(state.settings.fps, max);
    const unlimited = !!state.settings.fpsUnlimited;

    slider.min = '30';
    slider.max = String(max);
    slider.value = String(state.settings.fps);
    slider.disabled = unlimited;
    const fill = max > 30 ? ((state.settings.fps - 30) / (max - 30)) * 100 : 100;
    slider.style.setProperty('--fps-fill', `${Math.max(0, Math.min(100, fill))}%`);

    if (unlimitedBox) unlimitedBox.checked = unlimited;
    field?.classList.toggle('is-unlimited', unlimited);
    readout.classList.toggle('is-unlimited', unlimited);
    readout.textContent = unlimited ? t('fps.unlimited') : t('fps.value', { n: state.settings.fps });
    slider.setAttribute('aria-valuetext', readout.textContent);
    $('fps-max-label').textContent = t('fps.max', { n: max });

    const detected = $('fps-detected');
    if (detected) {
      if (state.fpsState === 'done') detected.textContent = t('settings.fpsDetected', { n: max });
      else if (state.fpsState === 'failed') detected.textContent = t('settings.fpsFallback', { n: max });
      else detected.textContent = t('settings.fpsDetecting');
      detected.classList.toggle('is-live', state.fpsState === 'done');
    }

    if (pop) {
      readout.classList.remove('is-pop');
      void readout.offsetWidth;
      readout.classList.add('is-pop');
      setTimeout(() => readout.classList.remove('is-pop'), 500);
    }
  }

  function snapRefreshRate(rate) {
    const raw = Math.round(Number(rate) || 0);
    if (!raw) return 0;
    const common = COMMON_REFRESH_RATES.find((value) => Math.abs(value - raw) <= Math.max(2, value * 0.03));
    return Math.max(30, Math.min(600, common || raw));
  }

  function measureRefreshRate() {
    return new Promise((resolve) => {
      if (document.visibilityState !== 'visible') {
        resolve(0);
        return;
      }

      const deltas = [];
      let frames = 0;
      let last = performance.now();
      const started = last;
      let finished = false;
      const timer = setTimeout(finish, 1800);

      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (deltas.length < 4) {
          resolve(0);
          return;
        }
        deltas.sort((a, b) => a - b);
        const median = deltas[Math.floor(deltas.length / 2)];
        resolve(median > 0 ? 1000 / median : 0);
      }

      function tick(now) {
        if (finished) return;
        const delta = now - last;
        last = now;
        frames += 1;
        if (frames > 2 && delta > 1 && delta < 100) deltas.push(delta);
        if (now - started < 900) requestAnimationFrame(tick);
        else finish();
      }

      requestAnimationFrame(tick);
    });
  }

  async function detectRefreshRate() {
    if (fpsDetectPromise) return fpsDetectPromise;
    state.fpsState = 'detecting';
    updateFpsUI();
    const button = $('btn-fps-detect');
    if (button) {
      button.disabled = true;
      button.classList.add('is-busy');
    }

    fpsDetectPromise = (async () => {
      await sleep(60);
      const nativeRate = Number(window.screen?.refreshRate);
      let measured = await measureRefreshRate();
      if (!measured && document.visibilityState === 'visible') {
        await sleep(350);
        measured = await measureRefreshRate();
      }
      if (!measured && Number.isFinite(nativeRate) && nativeRate > 0) measured = nativeRate;
      const max = snapRefreshRate(measured) || 600;
      state.fpsMax = max;
      state.settings.fpsMax = max;
      state.settings.fps = clampFps(state.settings.fps, max);
      state.fpsState = measured ? 'done' : 'failed';
      updateFpsUI(true);
      applyFpsLimit();
      queueFpsPersist();
      return max;
    })();

    try {
      return await fpsDetectPromise;
    } finally {
      fpsDetectPromise = null;
      if (button) {
        button.disabled = false;
        button.classList.remove('is-busy');
      }
    }
  }

  // ---------- Monet / Material 3 Expressive ----------
  const MONET_BASE_STATUS = 'M3 Expressive · 2025';
  const MONET_ROLES = [
    'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
    'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
    'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
    'surface', 'surfaceDim', 'surfaceBright', 'surfaceContainerLowest',
    'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh',
    'surfaceContainerHighest', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
    'outline', 'outlineVariant', 'error', 'onError', 'errorContainer',
    'onErrorContainer', 'shadow', 'scrim', 'inverseSurface', 'inverseOnSurface',
    'inversePrimary',
  ];
  let monetCache = null;
  let monetPersistTimer = 0;
  let monetStatusTimer = 0;
  let monetApplied = false;
  let monetAppliedSeed = '';

  function monetLib() {
    return window.MaterialColorUtilities || null;
  }

  function normalizeMonetSeed(value) {
    const match = String(value || '').trim().match(/^#?([0-9a-f]{6})$/i);
    return match ? `#${match[1].toLowerCase()}` : '#0a84ff';
  }

  // ---------- 卡片流光颜色 ----------
  function normalizeEdgeColor(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'rainbow') return 'rainbow';
    const match = raw.match(/^#([0-9a-f]{6})$/);
    return match ? `#${match[1]}` : 'rainbow';
  }

  function hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return { h: h * 360, s, l };
  }

  function hslToHex(h, s, l) {
    const hue = ((((h % 360) + 360) % 360) / 360);
    const sat = Math.max(0, Math.min(1, s));
    const light = Math.max(0, Math.min(1, l));
    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    const channel = (t) => {
      let x = t;
      if (x < 0) x += 1;
      if (x > 1) x -= 1;
      if (x < 1 / 6) return p + (q - p) * 6 * x;
      if (x < 1 / 2) return q;
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
      return p;
    };
    const toHex = (v) =>
      Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(channel(hue + 1 / 3))}${toHex(channel(hue))}${toHex(channel(hue - 1 / 3))}`;
  }

  function edgeStops(hex) {
    const { h, s, l } = hexToHsl(hex);
    const sat = s < 0.15 ? Math.min(0.35, s) : Math.max(0.55, Math.min(0.92, s));
    const light = Math.max(0.56, Math.min(0.74, l));
    const offsets = [-24, -12, 0, 12, 24, 12, 0, -12];
    return offsets.map((offset, index) =>
      hslToHex(h + offset, sat, Math.max(0.48, Math.min(0.82, light + (index % 2 ? 0.07 : -0.03))))
    );
  }

  function applyEdgeTheme() {
    const root = document.documentElement;
    const value = normalizeEdgeColor(state.settings.edgeColor);
    const custom = value !== 'rainbow';
    root.dataset.edge = custom ? 'custom' : 'rainbow';
    if (custom) {
      edgeStops(value).forEach((color, index) => {
        root.style.setProperty(`--edge-${index + 1}`, color);
      });
    } else {
      for (let index = 1; index <= 8; index += 1) root.style.removeProperty(`--edge-${index}`);
    }
    const input = $('set-edge-color');
    if (input && document.activeElement !== input) input.value = custom ? value : '#ff6b9d';
    const readout = $('edge-readout');
    if (readout) readout.textContent = custom ? value.toUpperCase() : t('settings.edgeRainbow');
    document.querySelectorAll('#edge-presets [data-edge-color]').forEach((button) => {
      button.classList.toggle('is-active', normalizeEdgeColor(button.dataset.edgeColor) === value);
    });
  }

  async function setEdgeColor(value, options = {}) {
    state.settings.edgeColor = normalizeEdgeColor(value);
    state.edgeDirty = true;
    applyEdgeTheme();
    if (options.persist === false) return;
    const res = await api('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edgeColor: state.settings.edgeColor }),
    });
    if (res?.ok) state.settings.edgeColor = normalizeEdgeColor(res.settings.edgeColor);
    state.edgeDirty = false;
    applyEdgeTheme();
  }

  // ---------- 界面字体 ----------
  const FONT_STACKS = {
    system:
      '"Inter", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", system-ui, -apple-system, "Segoe UI", sans-serif',
    yahei: '"Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif',
    segoe: '"Segoe UI", "Inter", "Microsoft YaHei UI", system-ui, sans-serif',
    serif: '"Noto Serif SC", "Songti SC", "SimSun", Georgia, "Times New Roman", serif',
    mono: '"Cascadia Code", "Consolas", "Sarasa Mono SC", "Microsoft YaHei UI", monospace',
  };
  let fontPersistTimer = 0;
  const loadedFontFaces = new Set();

  function customFontById(id) {
    return state.fonts.find((font) => font.id === id);
  }

  function customFontFamily(id) {
    return `IQXFont_${id}`;
  }

  function normalizeFontFamily(value) {
    const raw = String(value || '').trim();
    if (Object.prototype.hasOwnProperty.call(FONT_STACKS, raw)) return raw;
    const match = raw.match(/^custom:([0-9a-f]{4,40})$/);
    if (match && customFontById(match[1])) return raw;
    return 'system';
  }

  function fontStackFor(family) {
    if (family.startsWith('custom:')) {
      const id = family.slice(7);
      if (customFontById(id)) return `"${customFontFamily(id)}", ${FONT_STACKS.system}`;
      return FONT_STACKS.system;
    }
    return FONT_STACKS[family] || FONT_STACKS.system;
  }

  function normalizeFontSize(value) {
    const size = Math.round(Number(value) || 14);
    return Math.max(12, Math.min(20, size));
  }

  function normalizeFontWeight(value) {
    const weight = Math.round(Number(value) || 400);
    return weight === 500 || weight === 600 ? weight : 400;
  }

  function fontWeightLabel(weight) {
    if (weight === 500) return t('settings.fontMedium');
    if (weight === 600) return t('settings.fontBold');
    return t('settings.fontRegular');
  }

  function renderFontOptions() {
    const select = $('set-font-family');
    if (!select) return;
    const builtins = [
      ['system', 'settings.fontSystem'],
      ['yahei', 'settings.fontYahei'],
      ['segoe', 'settings.fontSegoe'],
      ['serif', 'settings.fontSerif'],
      ['mono', 'settings.fontMono'],
    ];
    let html = builtins.map(([value, key]) => `<option value="${value}">${esc(t(key))}</option>`).join('');
    if (state.fonts.length) {
      html += `<optgroup label="${esc(t('settings.fontCustomGroup'))}">`;
      html += state.fonts
        .map((font) => `<option value="custom:${font.id}">${esc(font.name)}</option>`)
        .join('');
      html += '</optgroup>';
    }
    select.innerHTML = html;
    const current = normalizeFontFamily(state.settings.fontFamily);
    select.value = current;
    if (!select.value) select.value = 'system';
  }

  function renderCustomFonts() {
    const box = $('font-custom-list');
    if (!box) return;
    if (!state.fonts.length) {
      box.innerHTML = `<span class="font-empty">${esc(t('settings.fontEmpty'))}</span>`;
      return;
    }
    const active = state.settings.fontFamily;
    box.innerHTML = state.fonts
      .map(
        (font) => `<span class="font-chip${active === `custom:${font.id}` ? ' is-active' : ''}">
          <b>${esc(font.name)}</b>
          <button type="button" data-font-use="${font.id}">${esc(t('settings.fontUse'))}</button>
          <button type="button" class="font-del" data-font-delete="${font.id}" aria-label="${esc(
            t('settings.fontDelete')
          )}">×</button>
        </span>`
      )
      .join('');
  }

  function installCustomFont(font) {
    if (!font || !window.FontFace || loadedFontFaces.has(font.id)) return;
    loadedFontFaces.add(font.id);
    try {
      const face = new FontFace(customFontFamily(font.id), `url("/api/fonts/${font.id}")`);
      face
        .load()
        .then((loaded) => {
          document.fonts.add(loaded);
          applyFontSettings();
        })
        .catch(() => loadedFontFaces.delete(font.id));
    } catch (err) {
      loadedFontFaces.delete(font.id);
    }
  }

  async function loadFonts() {
    const res = await api('/api/fonts');
    if (!res?.ok) return;
    state.fonts = Array.isArray(res.fonts) ? res.fonts : [];
    state.fonts.forEach(installCustomFont);
    renderFontOptions();
    renderCustomFonts();
    if (state.settings.fontFamily?.startsWith('custom:')) {
      const id = state.settings.fontFamily.slice(7);
      if (!customFontById(id)) state.settings.fontFamily = 'system';
    }
    applyFontSettings();
  }

  function applyFontSettings() {
    let family = normalizeFontFamily(state.settings.fontFamily);
    if (family.startsWith('custom:') && !customFontById(family.slice(7))) family = 'system';
    const size = normalizeFontSize(state.settings.fontSize);
    const weight = normalizeFontWeight(state.settings.fontWeight);
    state.settings.fontFamily = family;
    state.settings.fontSize = size;
    state.settings.fontWeight = weight;

    const root = document.documentElement;
    root.style.setProperty('--font', fontStackFor(family));
    root.style.setProperty('--font-scale', String(size / 14));
    root.style.setProperty('--font-weight-base', String(weight));
    root.dataset.fontFamily = family;
    root.dataset.fontWeight = String(weight);

    const familyInput = $('set-font-family');
    if (familyInput && familyInput.value !== family) familyInput.value = family;
    const sizeInput = $('set-font-size');
    if (sizeInput) sizeInput.value = String(size);
    const weightInput = $('set-font-weight');
    if (weightInput) weightInput.value = String(weight);
    const sizeLabel = $('font-size-value');
    if (sizeLabel) sizeLabel.textContent = `${size} px`;
    const readout = $('font-readout');
    if (readout) readout.textContent = `${size} px · ${fontWeightLabel(weight)}`;
    const preview = $('font-preview');
    if (preview) preview.style.fontFamily = fontStackFor(family);
    renderCustomFonts();
  }

  function queueFontPersist() {
    state.fontDirty = true;
    clearTimeout(fontPersistTimer);
    fontPersistTimer = setTimeout(async () => {
      const res = await api('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fontFamily: state.settings.fontFamily,
          fontSize: state.settings.fontSize,
          fontWeight: state.settings.fontWeight,
        }),
      });
      if (res?.ok) {
        state.settings.fontFamily = normalizeFontFamily(res.settings.fontFamily);
        state.settings.fontSize = normalizeFontSize(res.settings.fontSize);
        state.settings.fontWeight = normalizeFontWeight(res.settings.fontWeight);
      }
      state.fontDirty = false;
      applyFontSettings();
    }, 320);
  }

  function setFontSetting(key, value) {
    if (key === 'fontFamily') state.settings.fontFamily = normalizeFontFamily(value);
    if (key === 'fontSize') state.settings.fontSize = normalizeFontSize(value);
    if (key === 'fontWeight') state.settings.fontWeight = normalizeFontWeight(value);
    applyFontSettings();
    queueFontPersist();
  }

  async function uploadFont(file) {
    if (!file) return;
    const ext = String(file.name || '').split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
      toast(t('settings.fontUnsupported'), 'err');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast(t('settings.fontTooLarge'), 'err');
      return;
    }
    const btn = $('btn-font-add');
    setBusy(btn, true);
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const name = String(file.name).replace(/\.[^.]+$/, '').slice(0, 60);
      const res = await api('/api/fonts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, filename: file.name, data }),
      });
      if (!res?.ok || !res.font) throw new Error(res?.error || t('settings.fontAddFailed'));
      await loadFonts();
      setFontSetting('fontFamily', `custom:${res.font.id}`);
      toast(t('settings.fontAdded', { name: res.font.name }));
    } catch (err) {
      toast(err?.message || t('settings.fontAddFailed'), 'err');
    } finally {
      setBusy(btn, false);
    }
  }

  async function deleteFont(id) {
    const res = await api(`/api/fonts/${id}`, { method: 'DELETE' });
    if (!res?.ok) {
      toast(t('settings.fontDeleteFailed'), 'err');
      return;
    }
    loadedFontFaces.delete(id);
    if (state.settings.fontFamily === `custom:${id}`) state.settings.fontFamily = 'system';
    await loadFonts();
    applyFontSettings();
    toast(t('settings.fontRemoved'));
  }

  function monetKebab(name) {
    return name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
  }

  function generateMonetTheme(seed) {
    const lib = monetLib();
    if (!lib) return null;
    const normalized = normalizeMonetSeed(seed);
    if (monetCache && monetCache.seed === normalized) return monetCache;

    const argb = lib.argbFromHex(normalized);
    const build = (isDark) => {
      const scheme = new lib.SchemeExpressive(lib.Hct.fromInt(argb), isDark, 0, '2025', 'phone');
      const roles = {};
      for (const name of MONET_ROLES) {
        roles[name] = lib.hexFromArgb(scheme.colors[name]().getArgb(scheme));
      }
      return roles;
    };
    const light = build(false);
    const dark = build(true);
    const vars = (roles) =>
      Object.entries(roles)
        .map(([name, value]) => `--m3-${monetKebab(name)}: ${value};`)
        .join('\n');

    const css = `
html[data-monet="on"][data-theme="light"] {
  color-scheme: light;
${vars(light)}
}
html[data-monet="on"][data-theme="dark"] {
  color-scheme: dark;
${vars(dark)}
}
html[data-monet="on"][data-theme="system"] {
  color-scheme: light;
${vars(light)}
}
@media (prefers-color-scheme: dark) {
  html[data-monet="on"][data-theme="system"] {
    color-scheme: dark;
${vars(dark)}
  }
}`;
    monetCache = { seed: normalized, light, dark, css };
    return monetCache;
  }

  function monetPreviewRoles(generated) {
    const theme = document.documentElement.dataset.theme || 'system';
    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return dark ? generated.dark : generated.light;
  }

  function updateMonetPreview(generated) {
    if (!generated) return;
    const roles = monetPreviewRoles(generated);
    for (const role of ['primary', 'secondary', 'tertiary', 'surface']) {
      const swatch = $(`monet-swatch-${role}`);
      const hex = $(`monet-${role}-hex`);
      if (swatch) swatch.style.setProperty('--swatch', roles[role]);
      if (hex) hex.textContent = roles[role].toUpperCase();
    }
  }

  function setMonetStatus(text, isError = false) {
    const status = $('monet-status');
    if (!status) return;
    clearTimeout(monetStatusTimer);
    status.textContent = text || MONET_BASE_STATUS;
    status.classList.toggle('is-error', !!isError);
  }

  function flashMonetStatus(text, isError = false) {
    setMonetStatus(text, isError);
    if (!isError) {
      monetStatusTimer = setTimeout(() => setMonetStatus(MONET_BASE_STATUS), 2800);
    }
  }

  function updateMetaThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (bg) meta.setAttribute('content', bg);
  }

  function updateMonetUI(generated = null) {
    const seed = normalizeMonetSeed(state.settings.monetSeed);
    const field = $('monet-field');
    const toggle = $('set-monet');
    const seedInput = $('monet-seed');
    const seedLabel = $('monet-seed-label');
    if (!field || !toggle || !seedInput) return;

    state.settings.monetSeed = seed;
    toggle.checked = !!state.settings.monet;
    seedInput.value = seed;
    if (seedLabel) seedLabel.textContent = seed.toUpperCase();
    field.classList.toggle('is-active', !!state.settings.monet);

    document.querySelectorAll('#monet-presets button').forEach((btn) => {
      btn.classList.toggle('is-active', normalizeMonetSeed(btn.dataset.monetColor) === seed);
    });

    if (generated) updateMonetPreview(generated);
    setMonetStatus(MONET_BASE_STATUS);
  }

  function applyMonetTheme() {
    const style = $('monet-theme');
    const root = document.documentElement;
    if (!style) return null;

    const seed = normalizeMonetSeed(state.settings.monetSeed);
    const generated = generateMonetTheme(seed);
    if (!state.settings.monet) {
      root.removeAttribute('data-monet');
      style.textContent = '';
      monetApplied = false;
      monetAppliedSeed = seed;
      updateMonetUI(generated);
      updateMetaThemeColor();
      return generated;
    }

    if (!generated) {
      state.settings.monet = false;
      root.removeAttribute('data-monet');
      style.textContent = '';
      monetApplied = false;
      monetAppliedSeed = seed;
      updateMonetUI(null);
      setMonetStatus(t('settings.monetUnsupported'), true);
      return null;
    }

    style.textContent = generated.css;
    root.dataset.monet = 'on';
    monetApplied = true;
    monetAppliedSeed = seed;
    updateMonetUI(generated);
    updateMetaThemeColor();
    return generated;
  }

  function queueMonetPersist() {
    state.monetDirty = true;
    clearTimeout(monetPersistTimer);
    monetPersistTimer = setTimeout(async () => {
      const res = await api('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monet: state.settings.monet,
          monetSeed: state.settings.monetSeed,
        }),
      });
      if (res?.ok) {
        state.monetDirty = false;
        state.settings.monet = !!res.settings.monet;
        state.settings.monetSeed = normalizeMonetSeed(res.settings.monetSeed);
      }
    }, 350);
  }

  function setMonetEnabled(enabled, persist = true) {
    state.settings.monet = !!enabled;
    state.monetDirty = true;
    applyMonetTheme();
    if (persist) queueMonetPersist();
  }

  function setMonetSeed(seed, options = {}) {
    const { enable = true, persist = true } = options;
    state.settings.monetSeed = normalizeMonetSeed(seed);
    state.monetDirty = true;
    if (enable) state.settings.monet = true;
    applyMonetTheme();
    if (persist) queueMonetPersist();
  }

  async function pickMonetFromScreen() {
    if (!window.EyeDropper) {
      setMonetStatus(t('settings.monetUnsupported'), true);
      return;
    }
    try {
      const result = await new window.EyeDropper().open();
      setMonetSeed(result.sRGBHex);
      flashMonetStatus(`Monet · ${normalizeMonetSeed(result.sRGBHex).toUpperCase()}`);
    } catch (err) {
      if (err?.name !== 'AbortError') setMonetStatus(t('settings.monetUnsupported'), true);
    }
  }

  async function pickMonetFromImage(file) {
    if (!file) return;
    const lib = monetLib();
    if (!lib) {
      setMonetStatus(t('settings.monetUnsupported'), true);
      return;
    }

    setMonetStatus(t('settings.monetAnalyzing'));
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = async () => {
      try {
        const argb = await lib.sourceColorFromImage(image);
        const seed = lib.hexFromArgb(argb);
        URL.revokeObjectURL(url);
        setMonetSeed(seed);
        flashMonetStatus(`Monet · ${normalizeMonetSeed(seed).toUpperCase()}`);
      } catch {
        URL.revokeObjectURL(url);
        setMonetStatus(t('settings.monetImageFailed'), true);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setMonetStatus(t('settings.monetImageFailed'), true);
    };
    image.src = url;
  }

  function fillMonetUI() {
    const generated = generateMonetTheme(state.settings.monetSeed);
    updateMonetUI(generated);
  }

  // ---------- 帮助 / 版本更新 / 操作演示 ----------
  const HELP_COPY = {
    zh: {
      heroTitle: '帮助与更新',
      heroSub: '版本变化、基础操作与桌面窗口说明',
      updatesTitle: '版本更新',
      updatesSub: '查看这个版本带来的变化',
      guideTitle: '操作帮助页',
      guideSub: '了解 Infinite query X 的基本操作与运行逻辑',
      updatesHeading: '版本更新',
      guideHeading: '操作演示',
      updatesMeta: '10 个版本',
      newTag: 'NEW',
      pause: '暂停',
      play: '播放',
      stepLabel: '步骤 {n} / {m}',
      updates: [
        { version: 'v1.1.1', date: '2026-10-22', latest: true, desc: '新建页的城市选择换成与日期选择器同款的自绘弹层：分组城市网格、搜索过滤、逐组错峰浮现与弹性展开，选择后立即刷新结果。', tags: ['城市', '弹层', '动画'] },
        { version: 'v1.1.0', date: '2026-10-22', desc: '新增票种价格与购票链接、新活动 / 开票提醒弹窗（四角与灵动岛、可调位置与停留时间）、页码选择器、全国扫描动画与动画效果等级。', tags: ['提醒', '灵动岛', '页码', '动效'] },
        { version: 'v1.0.0', date: '2026-10-21', desc: '正式版：自定义日期选择器（弹性动画、月历、今天 / 选中态）、日期查询小窗、界面字体导入与卡片流光，正式开源。', tags: ['1.0', '正式版', '开源'] },
        { version: 'v0.9.2beta', date: '2026-10-21', desc: '新建页新增日期查询小窗：按系统时间定位今天，逐日查看展览 / 演出 / 赛事 / 同人展 / 其他；设置新增界面字体（字体、字号、字重），并支持导入 TTF / OTF / WOFF 字体。', tags: ['日期查询', '字体', '小窗'] },
        { version: 'v0.9.1beta', date: '2026-10-21', desc: '新建页新增一键刷新；卡片加入可调色的缓慢旋转彩虹柔光流边；启动时播放柔光唤醒动画。', tags: ['刷新', '彩虹流边', '可调色'] },
        { version: 'v0.9.0beta', date: '2026-10-21', desc: '新增帮助中心：版本更新记录与带自动轮播的操作演示。', tags: ['帮助', '操作演示', '动画'] },
        { version: 'v0.8.0beta', date: '2026-10-21', desc: '新增桌面窗口行为：最小化 / 关闭驻留托盘、隐藏任务栏图标、隐藏全屏按钮。', tags: ['托盘', '任务栏', '窗口'] },
        { version: 'v0.7.0beta', date: '2026-10-21', desc: '接入官方 Material Color Utilities，新增 Monet 取色与 Material 3 Expressive 动态主题。', tags: ['Monet', 'M3 Expressive', '取色'] },
        { version: 'v0.6.1beta', date: '2026-10-21', desc: '设置新增界面帧率：30–检测上限（最高 600 Hz），支持帧率无限制。', tags: ['帧率', '性能', '设置'] },
        { version: 'v0.6.0beta', date: '2026-10-20', desc: 'HyperOS 4 风格动效：柔光玻璃、页面切换、导航滑轨、数字滚动与主题扩散。', tags: ['HyperOS 4', '柔光玻璃', '动效'] },
      ],
      steps: [
        { title: '新建监控', desc: '打开左侧「新建」，搜索展会或按类型浏览，点「监控」即可加入任务列表。', icon: 'plus' },
        { title: '日期查询', desc: '在「新建」点日期胶囊打开自定义日历，默认今天，可翻月或点任意日期；选中后打开当天活动小窗。', icon: 'calendar' },
        { title: '一键刷新', desc: '在「新建」搜索或浏览后，点右侧圆形刷新按钮即可重新拉取当前列表，关键词、类型和页码都会保留。', icon: 'refresh' },
        { title: '查看余票', desc: '任务卡片会实时刷新；绿色「预售中」表示当前可购，还可以查看今日回流、最近可购和累计可购。', icon: 'ticket' },
        { title: '个性化外观', desc: '在「设置」调整界面帧率、Monet 动态取色、卡片流光颜色、界面字体（字体 / 字号 / 字重 / 导入字体）与主题。', icon: 'palette' },
        { title: '桌面窗口', desc: '在「桌面」开启最小化到托盘、关闭驻留托盘、隐藏任务栏图标或隐藏全屏按钮。', icon: 'desktop' },
        { title: '提醒与动效', desc: '在「设置 → 提醒弹窗」选择新活动 / 开票提醒、关注城市、四角或灵动岛位置与停留时间；「动画效果」可选完整 / 柔和 / 精简 / 关闭。', icon: 'bell' },
        { title: '托盘与退出', desc: '关闭到托盘后点击托盘图标恢复界面；托盘菜单中的「退出」可以彻底结束程序。', icon: 'tray' },
      ],
    },
    en: {
      heroTitle: 'Help & updates',
      heroSub: 'Release notes, basics and desktop window behavior',
      updatesTitle: 'Version updates',
      updatesSub: 'See what changed in this version',
      guideTitle: 'Operation guide',
      guideSub: 'Learn the basics and how Infinite query X works',
      updatesHeading: 'Version updates',
      guideHeading: 'Guided tour',
      updatesMeta: '10 releases',
      newTag: 'NEW',
      pause: 'Pause',
      play: 'Play',
      stepLabel: 'Step {n} / {m}',
      updates: [
        { version: 'v1.1.1', date: '2026-10-22', latest: true, desc: 'The New page city selector is now a custom animated popover: grouped city grid, search filter, staggered reveal and spring open.', tags: ['City', 'Popover', 'Motion'] },
        { version: 'v1.1.0', date: '2026-10-22', desc: 'Ticket prices and purchase links, new-event and on-sale notification popups (corners or dynamic island, adjustable position and duration), page picker, nationwide scan animation and motion levels.', tags: ['Notifications', 'Dynamic island', 'Pagination', 'Motion'] },
        { version: 'v1.0.0', date: '2026-10-21', desc: 'Official release: custom animated date picker, date lookup window, interface font import and card light edges. Open source.', tags: ['1.0', 'Stable', 'Open source'] },
        { version: 'v0.9.2beta', date: '2026-10-21', desc: 'Date lookup window on New (today from system time; browse exhibitions, shows, matches and doujin events by day), plus interface font settings with TTF / OTF / WOFF import.', tags: ['Date lookup', 'Font', 'Window'] },
        { version: 'v0.9.1beta', date: '2026-10-21', desc: 'One-tap refresh on New, adjustable slowly rotating rainbow light edges on cards, and a launch wake-up animation.', tags: ['Refresh', 'Rainbow edge', 'Custom color'] },
        { version: 'v0.9.0beta', date: '2026-10-21', desc: 'New help center with release notes and an auto-playing guided tour.', tags: ['Help', 'Guided tour', 'Motion'] },
        { version: 'v0.8.0beta', date: '2026-10-21', desc: 'Desktop window behavior: minimize/close to tray, hide taskbar icon, hide fullscreen button.', tags: ['Tray', 'Taskbar', 'Window'] },
        { version: 'v0.7.0beta', date: '2026-10-21', desc: 'Official Material Color Utilities with Monet seeding and Material 3 Expressive dynamic color.', tags: ['Monet', 'M3 Expressive', 'Dynamic color'] },
        { version: 'v0.6.1beta', date: '2026-10-21', desc: 'New UI frame rate setting from 30 to the detected refresh rate (max 600 Hz), plus unlimited.', tags: ['Frame rate', 'Performance', 'Settings'] },
        { version: 'v0.6.0beta', date: '2026-10-20', desc: 'HyperOS 4-inspired motion: soft glass, page transitions, navigation glide, rolling numbers and theme bloom.', tags: ['HyperOS 4', 'Soft glass', 'Motion'] },
      ],
      steps: [
        { title: 'Create a task', desc: 'Open New, search for an event or browse by category, then click Watch to add it to your task list.', icon: 'plus' },
        { title: 'Date lookup', desc: 'In New, tap the date pill to open the custom calendar. It starts on today; pick any day to open the date window.', icon: 'calendar' },
        { title: 'Refresh results', desc: 'After searching or browsing in New, tap the round refresh button to reload the current list while keeping the keyword, type and page.', icon: 'refresh' },
        { title: 'Watch availability', desc: 'Task cards refresh live. A green “On sale” pill means tickets are currently available; review restocks and on-sale time.', icon: 'ticket' },
        { title: 'Make it yours', desc: 'In Settings, adjust the UI frame rate, Monet dynamic color, card light color, interface font (family / size / weight / import) and theme.', icon: 'palette' },
        { title: 'Desktop behavior', desc: 'In Desktop, enable minimize to tray, keep running in tray on close, hide the taskbar icon, or hide the fullscreen button.', icon: 'desktop' },
        { title: 'Alerts & motion', desc: 'In Settings → Notifications pick new-event / on-sale alerts, the city, a corner or the dynamic island, and the duration. Motion offers Full / Soft / Lite / Off.', icon: 'bell' },
        { title: 'Tray & quit', desc: 'After closing to the tray, click the tray icon to reopen the window. Use Quit in the tray menu to exit completely.', icon: 'tray' },
      ],
    },
  };

  const HELP_ICONS = {
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20.4 11.2a8.4 8.4 0 1 0-2.2 6.1"/><path d="M20.6 4.6v5h-5"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z"/><path d="M14 5v14"/></svg>',
    palette: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h4.5A4.5 4.5 0 0 0 21 7.5 4.5 4.5 0 0 0 16.5 3z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="15" cy="6.5" r="1"/></svg>',
    desktop: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    tray: '<svg viewBox="0 0 24 24"><path d="M4 15h16M6 19h12"/><path d="M12 3v10m0 0l-3-3m3 3l3-3"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/></svg>',
  };

  const helpState = { tab: 'updates', index: 0, playing: true, timer: 0 };

  function helpCopy() {
    return state.lang === 'zh-CN' || state.lang === 'zh-TW' ? HELP_COPY.zh : HELP_COPY.en;
  }

  function helpIcon(name) {
    return HELP_ICONS[name] || HELP_ICONS.plus;
  }

  function renderHelpTimeline(copy) {
    const box = $('help-timeline');
    if (!box) return;
    box.innerHTML = copy.updates
      .map(
        (item, index) => `<article class="help-release${item.latest ? ' is-latest' : ''}" style="--i:${index}">
          <div class="help-release-top">
            <span class="help-release-version">${item.version}</span>
            ${item.latest ? `<span class="help-release-new">${copy.newTag}</span>` : ''}
            <span class="help-release-date">${item.date}</span>
          </div>
          <p>${item.desc}</p>
          <div class="help-release-tags">${item.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
        </article>`
      )
      .join('');
  }

  function renderHelpSteps(copy) {
    const box = $('help-steps');
    if (!box) return;
    box.innerHTML = copy.steps
      .map(
        (step, index) => `<li>
          <button type="button" class="help-step${index === helpState.index ? ' is-active' : ''}" data-help-step="${index}">
            <span class="help-step-num">${index + 1}</span>
            <span class="help-step-label">${step.title}</span>
          </button>
        </li>`
      )
      .join('');
  }

  function syncHelpPlayback() {
    const demo = $('help-demo');
    const button = $('help-demo-play');
    const label = $('help-demo-play-label');
    if (!demo || !button || !label) return;
    if (!motionOK()) helpState.playing = false;
    demo.classList.toggle('is-playing', helpState.playing);
    button.classList.toggle('is-paused', !helpState.playing);
    label.textContent = helpState.playing ? helpCopy().pause : helpCopy().play;
  }

  function renderHelpStep(animate = true) {
    const copy = helpCopy();
    const steps = copy.steps;
    helpState.index = Math.max(0, Math.min(steps.length - 1, helpState.index));
    const step = steps[helpState.index];
    const visual = $('help-demo-visual');
    const demo = $('help-demo');
    if (!visual || !demo) return;
    visual.innerHTML = helpIcon(step.icon);
    $('help-demo-step').textContent = copy.stepLabel
      .replace('{n}', String(helpState.index + 1))
      .replace('{m}', String(steps.length));
    $('help-demo-title').textContent = step.title;
    $('help-demo-desc').textContent = step.desc;
    document.querySelectorAll('[data-help-step]').forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.helpStep) === helpState.index);
    });

    if (animate) {
      demo.classList.remove('is-changing');
      void demo.offsetWidth;
      demo.classList.add('is-changing');
      setTimeout(() => demo.classList.remove('is-changing'), 600);
      demo.classList.remove('is-playing');
      void demo.offsetWidth;
      if (helpState.playing) demo.classList.add('is-playing');
    }
    syncHelpPlayback();
  }

  function renderHelp() {
    const copy = helpCopy();
    if (!$('help-hero-title')) return;
    $('help-hero-title').textContent = copy.heroTitle;
    $('help-hero-sub').textContent = copy.heroSub;
    $('help-hero-version').textContent = `v${state.meta?.version || '1.0.0'}`;
    $('help-updates-title').textContent = copy.updatesTitle;
    $('help-updates-sub').textContent = copy.updatesSub;
    $('help-guide-title').textContent = copy.guideTitle;
    $('help-guide-sub').textContent = copy.guideSub;
    $('help-updates-heading').textContent = copy.updatesHeading;
    $('help-guide-heading').textContent = copy.guideHeading;
    $('help-updates-meta').textContent = copy.updatesMeta;
    renderHelpTimeline(copy);
    renderHelpSteps(copy);
    renderHelpStep(false);
    syncHelpPlayback();
  }

  function stopHelpTimer() {
    clearTimeout(helpState.timer);
    helpState.timer = 0;
  }

  function startHelpTimer() {
    stopHelpTimer();
    if (!helpState.playing || !motionOK() || state.view !== 'help' || helpState.tab !== 'guide') return;
    helpState.timer = setTimeout(() => {
      helpState.index = (helpState.index + 1) % helpCopy().steps.length;
      renderHelpStep();
      startHelpTimer();
    }, 3200);
  }

  function setHelpTab(tab) {
    if (tab !== 'updates' && tab !== 'guide') return;
    helpState.tab = tab;
    document.querySelectorAll('[data-help-tab]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.helpTab === tab);
    });
    document.querySelectorAll('[data-help-panel]').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.helpPanel === tab);
    });
    if (tab === 'guide') {
      renderHelpStep(true);
      startHelpTimer();
    } else {
      stopHelpTimer();
    }
  }

  function syncHelpForView() {
    if (state.view === 'help') {
      renderHelp();
      if (helpState.tab === 'guide') startHelpTimer();
    } else {
      stopHelpTimer();
    }
  }

  const emptyArt = () =>
    '<div class="empty-art" aria-hidden="true"><span class="ring"></span><span class="ring"></span><b>∞</b></div>';

  function skeletonList(count = 5) {
    return `<div class="skeleton-list" aria-hidden="true">${Array.from(
      { length: count },
      () => `<div class="skeleton-card">
        <div class="skeleton-main"><span class="sk title"></span><span class="sk meta"></span></div>
        <span class="sk btn"></span>
      </div>`
    ).join('')}</div>`;
  }

  function setBusy(btn, busy) {
    if (!btn) return;
    if (busy) {
      btn.classList.add('is-busy');
      btn.disabled = true;
    } else {
      btn.classList.remove('is-busy');
      btn.disabled = false;
    }
  }

  function animateNumber(el, value, options = {}) {
    if (!el) return;
    const { bump = true } = options;
    const next = Math.max(0, Math.round(Number(value) || 0));
    const previous = Number(el.dataset.value || 0);
    el.dataset.value = String(next);
    if (previous === next) return;

    el._cancelNumber?.();
    const stat = el.closest('.stat');
    if (stat && bump) {
      stat.classList.remove('is-bump');
      void stat.offsetWidth;
      stat.classList.add('is-bump');
      clearTimeout(stat._bumpTimer);
      stat._bumpTimer = setTimeout(() => stat.classList.remove('is-bump'), 640);
    }

    if (!motionOK()) {
      el.textContent = String(next);
      return;
    }

    const duration = 620;
    const started = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(previous + (next - previous) * eased));
      if (progress < 1) {
        el._cancelNumber = requestUiFrame(tick);
      } else {
        el._cancelNumber = null;
        el.textContent = String(next);
      }
    };
    el._cancelNumber = requestUiFrame(tick);
  }

  function updateSummary(tasks) {
    const tickets = tasks.reduce((sum, task) => sum + task.tickets.length, 0);
    const available = tasks.reduce(
      (sum, task) => sum + task.tickets.filter((x) => x.status === '预售中').length,
      0
    );
    const polls = tasks.reduce((sum, task) => sum + task.polls, 0);
    animateNumber($('stat-tasks'), tasks.length);
    animateNumber($('stat-tickets'), tickets);
    animateNumber($('stat-available'), available);
    animateNumber($('stat-polls'), polls, { bump: false });
    $('stat-available')?.classList.toggle('has-live', available > 0);
  }

  function moveNavGlide() {
    const nav = $('nav');
    const glide = $('nav-glide');
    const active = document.querySelector('#nav .nav-item.is-active');
    if (!nav || !glide || !active) return;
    glide.style.setProperty('--nav-y', `${active.offsetTop}px`);
    glide.style.height = `${active.offsetHeight}px`;
    glide.classList.add('is-ready');
  }

  function moveThemeThumb() {
    const thumb = $('theme-thumb');
    const active = document.querySelector('#theme-switch button.is-active');
    if (!thumb || !active) return;
    thumb.style.setProperty('--tx', `${active.offsetLeft}px`);
    thumb.style.setProperty('--tw', `${active.offsetWidth}px`);
  }

  function pulseBadge() {
    const badge = $('task-count');
    if (!badge) return;
    badge.classList.remove('is-pop');
    void badge.offsetWidth;
    badge.classList.add('is-pop');
    setTimeout(() => badge.classList.remove('is-pop'), 600);
  }

  // ---------- 启动动画 ----------
  const BOOT_MIN_MS = 1850;
  const BOOT_MAX_MS = 4600;
  const bootStartedAt = performance.now();
  let bootTimer = 0;

  function setBootStatus(key) {
    const el = $('boot-status');
    if (el) el.textContent = t(key);
  }

  function flyBootLogo() {
    const logo = document.querySelector('.boot-logo');
    const target = document.querySelector('.brand-logo');
    if (!logo || !target || !motionOK()) return;
    const from = logo.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const clone = document.createElement('img');
    clone.src = logo.getAttribute('src') || '/static/logo.svg';
    clone.className = 'boot-fly';
    clone.setAttribute('aria-hidden', 'true');
    clone.style.left = `${from.left}px`;
    clone.style.top = `${from.top}px`;
    clone.style.width = `${from.width}px`;
    clone.style.height = `${from.height}px`;
    clone.style.borderRadius = `${Math.max(8, from.width * 0.28)}px`;
    document.body.appendChild(clone);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const scale = Math.max(0.12, to.width / from.width);
    const flight = clone.animate(
      [
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, filter: 'blur(0)' },
        {
          transform: `translate3d(${dx * 0.62}px, ${dy * 0.62}px, 0) scale(${1 - (1 - scale) * 0.55})`,
          opacity: 0.92,
          offset: 0.62,
        },
        {
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`,
          opacity: 0,
          filter: 'blur(1px)',
        },
      ],
      { duration: 720, easing: 'cubic-bezier(.24,.9,.28,1)', fill: 'forwards' }
    );
    flight.addEventListener('finish', () => clone.remove());
    setTimeout(() => clone.remove(), 1400);
  }

  function flashBrand() {
    const brand = document.querySelector('.brand');
    if (!brand) return;
    brand.classList.remove('is-lit');
    void brand.offsetWidth;
    brand.classList.add('is-lit');
    setTimeout(() => brand.classList.remove('is-lit'), 1300);
  }

  function openAppSequence() {
    if (!motionOK()) return;
    const app = document.querySelector('.app');
    if (!app) return;
    app.classList.remove('is-opening');
    void app.offsetWidth;
    app.classList.add('is-opening');
    setTimeout(() => app.classList.remove('is-opening'), 1650);
    flashBrand();
  }

  function dismissBoot() {
    if (bootDismissed) return;
    if (motionRank() <= 1) {
      bootDismissed = true;
      clearTimeout(bootTimer);
      const skipBoot = $('boot-veil');
      if (skipBoot) skipBoot.remove();
      return;
    }
    const elapsed = performance.now() - bootStartedAt;
    if (elapsed < BOOT_MIN_MS) {
      clearTimeout(bootTimer);
      bootTimer = setTimeout(dismissBoot, BOOT_MIN_MS - elapsed + 30);
      return;
    }
    bootDismissed = true;
    const boot = $('boot-veil');
    if (!boot) return;
    setBootStatus('boot.ready');
    boot.classList.add('is-ready');
    setTimeout(() => {
      boot.classList.add('is-done');
      flyBootLogo();
      openAppSequence();
      setTimeout(() => boot.remove(), 820);
    }, 220);
  }

  // ---------- 卡片流光 ----------
  function decorateFlow(root = document) {
    root
      .querySelectorAll('.card, .stat, .row-card, .task, .help-card, .help-hero, .help-demo, .desktop-row')
      .forEach((el) => {
        if (el.querySelector(':scope > .flow-edge')) return;
        const edge = document.createElement('i');
        edge.className = 'flow-edge';
        edge.setAttribute('aria-hidden', 'true');
        edge.style.animationDelay = `${(-Math.random() * 16).toFixed(2)}s`;
        el.appendChild(edge);
      });
  }

  function watchFlow() {
    decorateFlow();
    if (typeof MutationObserver === 'undefined') return;
    const target = document.querySelector('.main');
    if (!target) return;
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestUiFrame(() => {
        scheduled = false;
        decorateFlow();
      });
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  // ---------- 工具 ----------
  function t(key, vars) {
    const dict = I18N[state.lang] || I18N['zh-CN'];
    let text = dict[key] ?? I18N['zh-CN'][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
    }
    return text;
  }

  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const hhmmss = (ts) => {
    if (!ts) return '--:--:--';
    const d = new Date(ts * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  const duration = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    const p = (n) => String(n).padStart(2, '0');
    if (s >= 3600) return `${p(s / 3600 | 0)}:${p((s % 3600) / 60 | 0)}:${p(s % 60)}`;
    return `${p(s / 60 | 0)}:${p(s % 60)}`;
  };

  const fmtSecs = (seconds) => {
    const s = Math.max(0, Math.round(seconds || 0));
    const p = (n) => String(n).padStart(2, '0');
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}:${p(m)}:${p(s % 60)}` : `${m}:${p(s % 60)}`;
  };

  const fmtPrice = (cents, free) => {
    if (free) return '免费';
    const value = Number(cents) || 0;
    if (!value) return '—';
    const yuan = value / 100;
    return Number.isInteger(yuan) ? `￥${yuan}` : `￥${yuan.toFixed(2).replace(/0$/, '')}`;
  };

  const pillClass = (status) => {
    const map = { 预售中: 'green', 暂时售罄: 'amber', 已售罄: 'red', 已停售: 'red', 未开售: 'red', 不可售: 'red' };
    return map[status] || '';
  };

  function toast(message, kind) {
    const wrap = $('toasts');
    if (!wrap) return;
    while (wrap.children.length >= 4) wrap.firstElementChild.remove();

    const el = document.createElement('div');
    el.className = `toast${kind === 'err' ? ' err' : ''}`;
    const text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;
    const bar = document.createElement('i');
    bar.className = 'toast-bar';
    el.append(text, bar);
    wrap.appendChild(el);

    let timer = 0;
    let remaining = 3000;
    let startedAt = Date.now();
    const dismiss = () => {
      if (el.classList.contains('is-out')) return;
      clearTimeout(timer);
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 280);
    };
    const schedule = (delay) => {
      clearTimeout(timer);
      remaining = delay;
      startedAt = Date.now();
      timer = setTimeout(dismiss, delay);
    };
    schedule(3000);

    el.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      remaining = Math.max(500, remaining - (Date.now() - startedAt));
      bar.style.animationPlayState = 'paused';
    });
    el.addEventListener('mouseleave', () => {
      bar.style.animationPlayState = 'running';
      schedule(remaining);
    });
  }

  // ---------- 提醒弹窗 ----------
  const NOTIFY_ICONS = {
    new: '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M18 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
    sale: '<svg viewBox="0 0 24 24"><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z"/><path d="M14 5v14"/></svg>',
  };
  const notifySeen = new Set();
  let notifyPumpTimer = 0;

  function notificationDuration() {
    return Math.max(3000, Math.min(15000, Number(state.settings.notifyDuration) || 6000));
  }

  function updateNotifyLift() {
    const host = $('notify-host');
    if (!host) return;
    const bottom = host.dataset.pos === 'br' || host.dataset.pos === 'bl';
    const lift = bottom && host.children.length ? host.offsetHeight + 10 : 0;
    document.body.style.setProperty('--toast-lift', `${lift}px`);
  }

  function queueNotification(item) {
    if (!item || notifySeen.has(item.id)) return;
    notifySeen.add(item.id);
    state.notifications.pending.push(item);
    pumpNotifications();
  }

  function pumpNotifications() {
    clearTimeout(notifyPumpTimer);
    while (state.notifications.active < 2 && state.notifications.pending.length) {
      showNotification(state.notifications.pending.shift());
    }
    updateNotifyLift();
  }

  function showNotification(item) {
    const host = $('notify-host');
    if (!host) return;
    const island = host.dataset.pos === 'island';
    const isSale = item.kind === 'sale';
    const el = document.createElement('article');
    el.className = `notify${isSale ? ' is-sale' : ''}${island ? ' island' : ''}`;
    el.dataset.kind = item.kind;
    el.innerHTML = `
      <div class="notify-row">
        <span class="notify-icon">${NOTIFY_ICONS[isSale ? 'sale' : 'new']}</span>
        <div class="notify-main">
          <div class="notify-top"><span class="notify-tag"></span></div>
          <p class="notify-title"></p>
          <div class="notify-meta"></div>
        </div>
        <button type="button" class="notify-close" aria-label="${t('notify.close')}">×</button>
      </div>
      <div class="notify-extra">
        <div class="notify-actions"></div>
      </div>
      ${island ? '<i class="notify-shine" aria-hidden="true"></i>' : ''}
      <i class="notify-bar" style="--dur:${notificationDuration()}ms"></i>`;

    el.querySelector('.notify-tag').textContent = t(isSale ? 'notify.saleTag' : 'notify.newTag');
    const titleText = isSale
      ? t('notify.saleTitle', { name: item.title || '' })
      : item.title || t('notify.newTitle', { city: item.city || '' });
    el.querySelector('.notify-title').textContent = item.ticket ? `${titleText} · ${item.ticket}` : titleText;
    if (item.title) el.querySelector('.notify-title').title = item.title;
    const meta = [];
    if (item.city) meta.push(item.city);
    if (item.date) meta.push(item.date);
    if (item.price) meta.push(`${t('notify.price')} ${item.price}`);
    el.querySelector('.notify-meta').textContent = meta.join(' · ');

    const actions = el.querySelector('.notify-actions');
    if (item.url) {
      const link = document.createElement('a');
      link.className = 'btn tiny';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = t('notify.detail');
      actions.appendChild(link);
    }
    if (!isSale && item.projectId) {
      const watch = document.createElement('button');
      watch.type = 'button';
      watch.className = 'btn tiny ghost';
      watch.textContent = t('notify.watch');
      watch.addEventListener('click', async () => {
        setBusy(watch, true);
        const res = await api('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.projectId, name: item.title || '', city: item.city || '' }),
        });
        if (res?.ok) {
          toast(t('toast.added', { name: item.title || item.projectId }));
          dismiss();
          switchView('tasks');
          refresh();
        } else {
          setBusy(watch, false);
          toast(res?.error || t('toast.addFailed'), 'err');
        }
      });
      actions.appendChild(watch);
    }

    host.appendChild(el);
    state.notifications.active += 1;
    updateNotifyLift();

    if (island) {
      requestAnimationFrame(() => {
        setTimeout(() => el.classList.add('is-expanded'), 130);
      });
    }

    const bar = el.querySelector('.notify-bar');
    const duration = notificationDuration();
    let remaining = duration;
    let startedAt = Date.now();
    let timer = 0;
    let closed = false;

    const dismiss = () => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      el.classList.add('is-out');
      setTimeout(() => {
        el.remove();
        state.notifications.active = Math.max(0, state.notifications.active - 1);
        updateNotifyLift();
        pumpNotifications();
      }, 280);
    };

    const schedule = (ms) => {
      clearTimeout(timer);
      remaining = ms;
      startedAt = Date.now();
      timer = setTimeout(dismiss, ms);
    };

    el.querySelector('.notify-close').addEventListener('click', dismiss);
    el.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      remaining = Math.max(600, remaining - (Date.now() - startedAt));
      if (bar) bar.style.animationPlayState = 'paused';
    });
    el.addEventListener('mouseleave', () => {
      if (bar) bar.style.animationPlayState = 'running';
      schedule(remaining);
    });
    schedule(duration);
  }

  async function pollNotifications() {
    if (!state.notifications.ready) {
      const res = await api('/api/notifications?peek=1');
      if (res?.ok) {
        state.notifications.cursor = Number(res.latest) || 0;
        state.notifications.ready = true;
      }
      return;
    }
    if (!state.settings.notifyNew && !state.settings.notifySale) return;
    const res = await api(`/api/notifications?after=${state.notifications.cursor}`);
    if (!res?.ok) return;
    state.notifications.cursor = Math.max(state.notifications.cursor, Number(res.latest) || 0);
    (res.items || []).forEach(queueNotification);
  }

  async function api(path, options) {
    try {
      const res = await fetch(path, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      state.online = false;
      return null;
    }
  }

  // ---------- 语言 / 主题 ----------
  function applyI18n() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      const key = el.dataset.i18nPh;
      if (key) el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.dataset.i18nTitle;
      if (key) el.setAttribute('title', t(key));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.dataset.i18nAria;
      if (key) el.setAttribute('aria-label', t(key));
    });
    $('lang').value = state.lang;
    $('set-lang').value = state.lang;
    renderCityTrigger();
    if (state.cityPicker.open) renderCityList();
    const notifyCity = $('set-notify-city');
    if (notifyCity && notifyCity.options.length) notifyCity.options[0].textContent = t('cat.nationwide');
    applyViewText();
    updateFpsUI(false);
    if ($('monet-field')) fillMonetUI();
    if ($('edge-field')) applyEdgeTheme();
    if ($('font-field')) {
      renderFontOptions();
      applyFontSettings();
    }
    if ($('date-query')) {
      syncDateUI();
      if (state.datePicker.open) renderCalendar('');
      if ($('date-window')?.classList.contains('is-open')) renderDateWindow(state.datePayload);
    }
    if ($('desktop-options')) fillDesktopSettings();
    if ($('help-hero-title')) {
      renderHelp();
      syncHelpForView();
    }
    requestAnimationFrame(() => {
      moveNavGlide();
      moveThemeThumb();
    });
      if (typeof applyNotifyUI === 'function') applyNotifyUI();
    if (state.pagePicker.open) renderPagePicker();
  }
  function setLanguage(lang, persist) {
    if (!LANGS.includes(lang)) lang = 'zh-CN';
    state.lang = lang;
    localStorage.setItem('iqx.lang', lang);
    applyI18n();
    if (state.view === 'tasks') renderTasks();
    if (state.view === 'new') {
      if (state.mode === 'search' && state.search.keyword) renderSearch();
      else if (state.mode === 'list') renderList();
      else renderAll();
    }
    if (persist) {
      state.settings.language = lang;
      api('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
    }
    updateStatus();
    pulseContent();
  }

  function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = 'system';
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('#theme-switch button').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.themeValue === theme);
    });
    requestAnimationFrame(() => {
      moveThemeThumb();
      if (monetCache) updateMonetPreview(monetCache);
      updateMetaThemeColor();
    });
  }

  function chooseTheme(theme, event) {
    if (!THEMES.includes(theme)) return;
    const changed = state.settings.theme !== theme;
    state.settings.theme = theme;
    localStorage.setItem('iqx.theme', theme);

    api('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme }),
    });

    if (!changed) {
      applyTheme(theme);
      return;
    }

    applyTheme(theme);
    if (!motionOK()) return;

    const source = event?.currentTarget || document.querySelector(`#theme-switch button[data-theme-value="${theme}"]`);
    const rect = source?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight - 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const root = document.documentElement;
    root.classList.remove('theme-changing');
    void root.offsetWidth;
    root.classList.add('theme-changing');
    setTimeout(() => root.classList.remove('theme-changing'), 620);

    const bloom = document.createElement('span');
    bloom.className = 'theme-bloom';
    bloom.setAttribute('aria-hidden', 'true');
    bloom.style.left = `${x}px`;
    bloom.style.top = `${y}px`;
    bloom.style.width = `${radius * 2}px`;
    bloom.style.height = `${radius * 2}px`;
    document.body.appendChild(bloom);
    setTimeout(() => bloom.remove(), 900);
  }

  // ---------- 视图切换 ----------
  const VIEWS = {
    tasks: ['page.tasks.title', 'page.tasks.sub'],
    new: ['page.new.title', 'page.new.sub'],
    settings: ['page.settings.title', 'page.settings.sub'],
    desktop: ['desktop.title', 'desktop.sub'],
    help: ['page.help.title', 'page.help.sub'],
    about: ['page.about.title', 'page.about.sub'],
  };

  function applyViewText() {
    const [titleKey, subKey] = VIEWS[state.view];
    $('page-title').textContent = t(titleKey);
    $('page-sub').textContent = t(subKey);
  }

  function cleanupPageLeaving() {
    document.querySelectorAll('.content.is-page-leaving').forEach((el) => {
      el.classList.remove('is-page-leaving');
      el.classList.add('is-hidden');
      el.removeAttribute('style');
    });
  }

  function leavePage(section) {
    if (!section) return;
    const rect = section.getBoundingClientRect();
    section.classList.add('is-page-leaving');
    section.style.position = 'fixed';
    section.style.top = `${rect.top}px`;
    section.style.left = `${rect.left}px`;
    section.style.width = `${rect.width}px`;
    section.style.height = `${rect.height}px`;
    section.style.margin = '0';
    section.style.overflow = 'hidden';
    section.style.zIndex = '3';
    section.style.pointerEvents = 'none';
    section.style.transformOrigin = '50% 0';
    setTimeout(() => {
      if (!section.classList.contains('is-page-leaving')) return;
      section.classList.remove('is-page-leaving');
      section.classList.add('is-hidden');
      section.removeAttribute('style');
    }, 260);
  }

  function enterPage(section) {
    if (!section || !motionOK()) return;
    section.classList.remove('is-entering');
    void section.offsetWidth;
    section.classList.add('is-entering');
    setTimeout(() => section.classList.remove('is-entering'), 680);

    const titles = document.querySelector('.titles');
    if (titles) {
      titles.classList.remove('is-switching');
      void titles.offsetWidth;
      titles.classList.add('is-switching');
      setTimeout(() => titles.classList.remove('is-switching'), 900);
    }
  }

  function applySwitchView(view) {
    state.view = view;
    document.querySelectorAll('.nav-item').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.view === view));
    document.querySelectorAll('.content').forEach((el) => {
      if (!el.classList.contains('is-page-leaving')) el.classList.add('is-hidden');
    });
    $(`view-${view}`).classList.remove('is-hidden');
    applyViewText();
    $('top-actions').innerHTML = '';
    window.scrollTo({ top: viewScroll[view] || 0, left: 0, behavior: 'instant' });

    requestAnimationFrame(() => {
      moveNavGlide();
      updateScrollState();
    });

    if (view === 'new' && state.all.items.length === 0 && state.tasks.length === 0) {
      setTimeout(() => $('kw')?.focus({ preventScroll: true }), 80);
    }
    if (view === 'new' && state.mode === 'none') {
      loadList('', 0, 1);
    }
    if (view === 'settings' && state.fpsState === 'failed') {
      setTimeout(() => detectRefreshRate(), 300);
    }
    if (view === 'desktop') fillDesktopSettings();
    if (view === 'help') syncHelpForView();
    else stopHelpTimer();
  }

  function switchView(view, options = {}) {
    if (!VIEWS[view]) return;
    if (state.view === view && !options.force) {
      window.scrollTo({ top: 0, behavior: motionOK() ? 'smooth' : 'auto' });
      return;
    }

    closePagePicker();
    closeDatePicker();
    closeCityPicker();
    const previous = state.view;
    const oldSection = $(`view-${previous}`);
    const animate = options.animate !== false && motionOK();
    viewScroll[previous] = window.scrollY;

    cleanupPageLeaving();
    if (animate && !options.force) leavePage(oldSection);
    applySwitchView(view);
    if (animate) enterPage($(`view-${view}`));
  }

  // ---------- 任务 ----------
  // ---------- 实时刷新（回流相关显示每秒走动） ----------
  const restockSeen = new Map();
  const seenTasks = new Set();

  function relativeTime(diff) {
    const s = Math.max(0, Math.round(diff));
    if (s < 5) return t('time.now');
    if (s < 60) return t('time.sec', { n: s });
    if (s < 3600) return t('time.min', { n: Math.floor(s / 60) });
    return t('time.hour', { n: Math.floor(s / 3600) });
  }

  function tickLive() {
    const now = Date.now() / 1000;
    document.querySelectorAll('.live-secs').forEach((td) => {
      const base = Number(td.dataset.base) || 0;
      const running = td.dataset.status === '预售中';
      const updated = Number(td.dataset.updated) || 0;
      const extra = running && updated ? Math.max(0, now - updated) : 0;
      td.textContent = fmtSecs(base + extra);
    });
    document.querySelectorAll('.live-last').forEach((td) => {
      const ts = Number(td.dataset.ts) || 0;
      if (!ts) {
        td.textContent = '—';
        return;
      }
      td.textContent = td.dataset.status === '预售中' ? t('task.onSaleNow') : relativeTime(now - ts);
    });
  }

  function highlightRestocks(tasks) {
    tasks.forEach((task) => {
      task.tickets.forEach((x) => {
        const key = `${task.id}|${x.screen}|${x.desc}`;
        const previous = restockSeen.get(key);
        restockSeen.set(key, x.restocks);
        if (previous === undefined || x.restocks <= previous) return;
        const name = (x.screen ? x.screen + ' ' : '') + x.desc;
        toast(t('toast.restock', { name }));
        const row = document.querySelector(`tr[data-rkey="${encodeURIComponent(key)}"]`);
        if (row) {
          row.classList.add('flash');
          setTimeout(() => row.classList.remove('flash'), 2200);
        }
      });
    });
  }

  function renderTasks() {
    const list = $('task-list');
    const tasks = state.tasks;
    const countText = String(tasks.length);
    if ($('task-count').textContent !== countText) {
      $('task-count').textContent = countText;
      pulseBadge();
    }

    updateSummary(tasks);

    const currentIds = new Set(tasks.map((task) => task.id));
    for (const id of [...seenTasks]) if (!currentIds.has(id)) seenTasks.delete(id);

    if (!tasks.length) {
      list.innerHTML = `
        <div class="empty">
          ${emptyArt()}
          <h3>${t('empty.title')}</h3>
          <p>${t('empty.sub')}</p>
          <button class="btn" id="go-new">${t('empty.cta')}</button>
        </div>`;
      $('go-new')?.addEventListener('click', () => switchView('new'));
      return;
    }

    list.innerHTML = tasks
      .map((task, taskIndex) => {
        const isNew = !seenTasks.has(task.id);
        if (isNew) seenTasks.add(task.id);
        const rows = task.tickets
          .map((x, index) => {
            const rowKey = encodeURIComponent(`${task.id}|${x.screen}|${x.desc}`);
            const buyUrl = x.ticketId
              ? `${DETAIL_URL(task.id)}&ticket_id=${encodeURIComponent(x.ticketId)}`
              : DETAIL_URL(task.id);
            return `<tr data-rkey="${rowKey}" style="--ri:${index}">
              <td class="ticket-name">${esc((x.screen ? x.screen + ' ' : '') + x.desc)}<a class="ticket-buy" href="${esc(
                buyUrl
              )}" target="_blank" rel="noreferrer" title="${t('task.buy')}">${t('task.buy')} ↗</a></td>
              <td class="num price">${esc(fmtPrice(x.price, x.free))}</td>
              <td class="num restocks">${x.restocks ? x.restocks : '—'}</td>
              <td class="num live-last" data-ts="${x.last || 0}" data-status="${esc(x.status)}">${
                x.last ? hhmmss(x.last) : '—'
              }</td>
              <td class="num live-secs col-total" data-base="${x.secs || 0}" data-status="${esc(
                x.status
              )}" data-updated="${task.updated || 0}">${fmtSecs(x.secs || 0)}</td>
              <td class="status"><span class="pill ${pillClass(x.status)}">${esc(statusLabel(x.status))}</span></td>
            </tr>`;
          })
          .join('');

        const changes = task.changes
          .slice(0, 4)
          .map(
            (c) => `<div class="change">
              <span class="t">${esc(c.at)}</span>
              <span><b>${esc(changeLabel(c.kind))}</b> ${esc(c.name)}${
                c.kind === '状态变化'
                  ? ` · ${esc(statusLabel(c.old))} → ${esc(statusLabel(c.new))}`
                  : c.new
                    ? ` · ${esc(statusLabel(c.new))}`
                    : ''
              }</span>
            </div>`
          )
          .join('');

        const error = task.lastError
          ? `<span class="pill red">${esc(task.lastError.slice(0, 60))}</span>`
          : '';

        return `<article class="task${isNew ? ' is-new' : ''}" data-task-id="${esc(task.id)}" style="--i:${taskIndex}">
          <header class="task-head">
            <span class="pill blue">${t('task.running')}</span>
            <div class="task-title">
              <h3 title="${esc(task.name)}">${esc(task.name)}</h3>
              <p>
                <span>${t('row.id')} ${esc(task.id)}</span>
                <span>${t('task.run')} ${duration(Date.now() / 1000 - task.started)}</span>
                <span>${t('task.req')} ${task.polls}</span>
                <span>${t('task.err')} ${task.errors}</span>
                <span>${t('task.upd')} ${hhmmss(task.updated)}</span>
                <a class="link" href="${DETAIL_URL(task.id)}" target="_blank" rel="noreferrer">
                  <svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-8 8"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>
                  ${t('row.link')}
                </a>
                ${error}
              </p>
            </div>
            <button class="btn tiny danger" data-stop="${esc(task.id)}">${t('task.stop')}</button>
          </header>
          <div class="task-body">
            ${
              task.tickets.length
                ? `<div class="tickets-wrap"><table class="tickets">
                     <thead><tr>
                       <th>${t('task.count', { n: task.tickets.length })}</th>
                       <th class="num">${t('task.colPrice')}</th>
                       <th class="num"><span class="live-dot"></span>${t('task.colRestock')}</th>
                       <th class="num">${t('task.colLast')}</th>
                       <th class="num col-total">${t('task.colTotal')}</th>
                       <th class="status"></th>
                     </tr></thead>
                     <tbody>${rows}</tbody>
                   </table></div>
                   <div class="hint small">${t('task.restockHint')}</div>`
                : `<div class="hint">${t('task.waiting')}</div>`
            }
            ${changes ? `<div class="changes">${changes}</div>` : ''}
          </div>
        </article>`;
      })
      .join('');

    list.querySelectorAll('[data-stop]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.task');
        const taskId = btn.dataset.stop;
        setBusy(btn, true);
        const res = await api(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
        if (!res?.ok) {
          setBusy(btn, false);
          toast(t('toast.stopFailed'), 'err');
          return;
        }
        seenTasks.delete(taskId);
        card?.classList.add('is-leaving');
        if (card) card.style.pointerEvents = 'none';
        toast(t('toast.stopped'));
        await sleep(280);
        refresh();
      });
    });

    highlightRestocks(tasks);
    tickLive();
  }

  // ---------- 搜索结果 ----------
  function resultRow(item, index = 0) {
    return `<div class="row-card" style="--i:${index}">
      <div class="row-main">
        <div class="row-title">
          <span class="name" title="${esc(item.name)}">${esc(item.name)}</span>
          <span class="pill ${pillClass(item.status)}">${esc(statusLabel(item.status) || '-')}</span>
        </div>
        <div class="row-meta">
          <span>${t('row.id')} <b>${esc(item.id)}</b></span>
          <span>${t('row.city')} <b>${esc(item.city || '-')}</b></span>
          <span>${t('row.date')} <b>${esc(item.date || '-')}</b></span>
          <span>${t('row.sale')} <b>${esc(item.saleAt || '-')}</b></span>
          <span>${t('row.price')} <b>${esc(item.price || '-')}</b></span>
          <a class="link" href="${esc(item.url || DETAIL_URL(item.id))}" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-8 8"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>
            ${t('row.link')}
          </a>
        </div>
      </div>
      <button class="btn tiny" data-watch="${esc(item.id)}" data-name="${esc(item.name)}" data-city="${esc(
        item.city || ''
      )}">${t('new.watch')}</button>
    </div>`;
  }

  function paintRows(box, items) {
    box.classList.remove('is-stagger');
    box.innerHTML = items.map((item, index) => resultRow(item, index)).join('');
    void box.offsetWidth;
    box.classList.add('is-stagger');
    setTimeout(() => box.classList.remove('is-stagger'), 1200);
    bindWatchButtons(box);
  }

  function bindWatchButtons(root, onSuccess) {
    root.querySelectorAll('[data-watch]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        setBusy(btn, true);
        const res = await api('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: btn.dataset.watch,
            name: btn.dataset.name,
            city: btn.dataset.city || '',
          }),
        });
        if (res?.ok) {
          toast(t('toast.added', { name: btn.dataset.name }));
          switchView('tasks');
          refresh();
          if (typeof onSuccess === 'function') onSuccess();
        } else {
          setBusy(btn, false);
          btn.textContent = t('new.watch');
          toast(res?.error || t('toast.addFailed'), 'err');
        }
      });
    });
  }

  function renderSearch() {
    const { items, page, keyword, loading } = state.search;
    const box = $('results');
    box.classList.remove('is-stagger');
    if (loading) {
      box.innerHTML = `<div class="loading-line"><span class="spin"></span> ${t('new.loading', {
        q: esc(keyword),
      })}</div>${skeletonList(5)}`;
      $('pager').classList.add('is-hidden');
      return;
    }
    if (!keyword) {
      box.innerHTML = '';
      $('pager').classList.add('is-hidden');
      return;
    }
    if (!items.length) {
      box.innerHTML = `<div class="empty">${emptyArt()}<h3>${t('new.notFound')}</h3><p>${t('new.tryAll')}</p></div>`;
      $('pager').classList.add('is-hidden');
      return;
    }
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const current = Math.min(Math.max(1, page || 1), pages);
    state.search.page = current;
    const start = (current - 1) * PAGE_SIZE;
    paintRows(box, items.slice(start, start + PAGE_SIZE));
    $('pager').classList.remove('is-hidden');
    $('page-label').textContent =
      t('new.pageOf', { n: current, m: pages }) + ' · ' + t('new.total', { n: items.length });
    $('page-total-hint').textContent = state.search.partial
      ? t('new.pageLimitHint', { n: pages })
      : t('new.pageTotalHint', { n: pages });
  }

  function renderAll() {
    const { items, page, loading, running } = state.all;
    const box = $('results');
    if ((loading || running) && !items.length) {
      box.classList.remove('is-stagger');
      box.innerHTML = `<div class="loading-line"><span class="spin"></span> ${t('new.loadingAll', {
        extra: '',
      })}</div>${skeletonList(6)}`;
      $('pager').classList.add('is-hidden');
      return;
    }
    if (!items.length) {
      box.innerHTML = `<div class="empty">${emptyArt()}<h3>${t('new.allEmpty')}</h3><p>${t(
        'new.allEmptyHint'
      )}</p></div>`;
      $('pager').classList.add('is-hidden');
      return;
    }
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const current = Math.min(Math.max(1, page || 1), pages);
    state.all.page = current;
    const start = (current - 1) * PAGE_SIZE;
    paintRows(box, items.slice(start, start + PAGE_SIZE));
    $('pager').classList.remove('is-hidden');
    $('page-label').textContent =
      t('new.pageOf', { n: current, m: pages }) + ' · ' + t('new.total', { n: items.length });
    $('page-total-hint').textContent = t('new.pageTotalHint', { n: pages });
  }

  async function doSearch(page = 1, keywordOverride = null, options = {}) {
    const keyword = String(keywordOverride ?? $('kw').value).trim();
    if (!keyword) return false;
    const searchBtn = $('btn-search');
    if (!options.fromRefresh) setBusy(searchBtn, true);
    if ($('kw').value.trim() !== keyword) $('kw').value = keyword;
    state.mode = 'search';
    state.all.items = [];
    state.search = { keyword, page: 1, items: [], loading: true, pages: 1, partial: false };
    renderSearch();
    try {
      const res = await api(`/api/search?q=${encodeURIComponent(keyword)}`);
      state.search.loading = false;
      if (!res || !res.ok) {
        state.search.items = [];
        renderSearch();
        if (!options.fromRefresh) toast(res?.error || t('toast.searchFailed'), 'err');
        return false;
      }
      state.search.items = res.items || [];
      state.search.pages = res.pages || 1;
      state.search.partial = !!res.partial;
      state.search.page = Math.min(Math.max(1, page), state.search.pages);
      renderSearch();
      if (options.fromRefresh) closePagePicker();
      return true;
    } finally {
      if (!options.fromRefresh) setBusy(searchBtn, false);
    }
  }

  async function loadCities() {
    const res = await api('/api/cities');
    if (!res || !res.ok || !res.items || !res.items.length) return;
    state.cities = res.items;
    renderCityTrigger();
    if (state.cityPicker.open) renderCityList();
  }

  // ---------- 城市选择器 ----------
  function cityGroups() {
    const groups = new Map();
    for (const city of state.cities) {
      const letter = city.letter || '#';
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter).push(city);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function renderCityTrigger() {
    const label = $('city-trigger-label');
    if (!label) return;
    if (!state.cityArea) {
      label.textContent = t('cat.nationwide');
      return;
    }
    const city = state.cities.find((item) => Number(item.id) === Number(state.cityArea));
    label.textContent = city ? city.name : state.cityName || t('cat.nationwide');
  }

  function positionCityPicker(anchor) {
    const pop = $('city-popover');
    if (!pop || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = pop.offsetWidth || 404;
    const height = pop.offsetHeight || 420;
    let left = rect.right - width;
    left = Math.max(12, Math.min(window.innerWidth - width - 12, left));
    let top = rect.bottom + 8;
    let above = false;
    if (top + height > window.innerHeight - 12) {
      top = rect.top - height - 8;
      above = true;
    }
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.max(12, Math.round(top))}px`;
    pop.classList.toggle('is-above', above);
  }

  function renderCityList() {
    const all = $('city-all');
    const box = $('city-groups');
    const count = $('city-count');
    if (!all || !box) return;
    const query = String(state.cityPicker.filter || '').trim().toLowerCase();
    all.innerHTML = `<button type="button" class="city-chip is-all${
      !state.cityArea ? ' is-active' : ''
    }" data-city-id="0" data-city-name="${esc(t('cat.nationwide'))}">${esc(t('cat.nationwide'))}</button>`;
    let shown = 0;
    const html = cityGroups()
      .map(([letter, cities], gi) => {
        const matches = cities.filter((city) => {
          if (!query) return true;
          const name = String(city.name || '').toLowerCase();
          const full = String(city.fullname || '').toLowerCase();
          return name.includes(query) || full.includes(query) || String(letter).toLowerCase() === query;
        });
        if (!matches.length) return '';
        shown += matches.length;
        return `<section class="city-group" style="--gi:${gi}"><h4>${esc(letter)}</h4><div class="city-grid">${matches
          .map(
            (city) => `<button type="button" class="city-chip${
              Number(city.id) === Number(state.cityArea) ? ' is-active' : ''
            }" data-city-id="${city.id}" data-city-name="${esc(city.name)}"><span>${esc(city.name)}</span>${
              city.num ? `<em>${city.num}</em>` : ''
            }</button>`
          )
          .join('')}</div></section>`;
      })
      .join('');
    box.innerHTML = html || `<div class="city-empty">${esc(t('city.empty'))}</div>`;
    if (count) count.textContent = t('city.count', { n: shown });
  }

  function openCityPicker() {
    const pop = $('city-popover');
    const trigger = $('city-trigger');
    if (!pop || !trigger) return;
    state.cityPicker.open = true;
    state.cityPicker.openedAt = performance.now();
    state.cityPicker.filter = '';
    const search = $('city-search');
    if (search) search.value = '';
    renderCityList();
    trigger.setAttribute('aria-expanded', 'true');
    pop.classList.add('is-open');
    pop.setAttribute('aria-hidden', 'false');
    positionCityPicker(trigger);
    requestAnimationFrame(() => positionCityPicker(trigger));
    if (!state.cities.length) loadCities();
  }

  function closeCityPicker() {
    if (!state.cityPicker.open) return;
    state.cityPicker.open = false;
    $('city-trigger')?.setAttribute('aria-expanded', 'false');
    $('city-popover')?.classList.remove('is-open');
    $('city-popover')?.setAttribute('aria-hidden', 'true');
  }

  function selectCity(id, name) {
    state.cityArea = Number(id) || 0;
    state.cityName = name || '';
    renderCityTrigger();
    closeCityPicker();
    const active = document.querySelector('#type-chips .chip.is-active');
    loadList(active?.dataset.type || '', state.cityArea, 1);
    requestAnimationFrame(() => {
      if (motionOK()) $('results')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  async function loadList(pType, area, page = 1, options = {}) {
    state.mode = 'list';
    state.search.keyword = '';
    state.list = { type: pType, area, page: 1, items: [], loading: true, pages: 1, partial: false };
    renderList();
    const res = await api(`/api/list?type=${encodeURIComponent(pType)}&area=${area}`);
    state.list.loading = false;
    if (!res || !res.ok) {
      state.list.items = [];
      renderList();
      if (!options.fromRefresh) toast(res?.error || t('toast.searchFailed'), 'err');
      return false;
    }
    state.list.items = res.items || [];
    state.list.pages = res.pages || 1;
    state.list.partial = !!res.partial;
    state.list.page = Math.min(Math.max(1, page), state.list.pages);
    renderList();
    return true;
  }

  function renderList() {
    const { items, page, loading } = state.list;
    const box = $('results');
    box.classList.remove('is-stagger');
    if (loading) {
      box.innerHTML = `<div class="loading-line"><span class="spin"></span> ${t(
        'new.loadingList'
      )}</div>${skeletonList(5)}`;
      $('pager').classList.add('is-hidden');
      return;
    }
    if (!items.length) {
      box.innerHTML = `<div class="empty">${emptyArt()}<h3>${t('new.notFound')}</h3><p>${t('new.tryAll')}</p></div>`;
      $('pager').classList.add('is-hidden');
      return;
    }
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const current = Math.min(Math.max(1, page || 1), pages);
    state.list.page = current;
    const start = (current - 1) * PAGE_SIZE;
    paintRows(box, items.slice(start, start + PAGE_SIZE));
    $('pager').classList.remove('is-hidden');
    $('page-label').textContent =
      t('new.pageOf', { n: current, m: pages }) + ' · ' + t('new.total', { n: items.length });
    $('page-total-hint').textContent = state.list.partial
      ? t('new.pageLimitHint', { n: pages })
      : t('new.pageTotalHint', { n: pages });
  }

  // ---------- 新建页刷新 ----------
  let refreshingResults = false;

  function setRefreshBusy(busy) {
    const btn = $('btn-refresh');
    if (!btn) return;
    btn.classList.toggle('is-refreshing', busy);
    btn.disabled = busy;
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  async function refreshResults() {
    if (refreshingResults) return;
    const mode = state.mode;
    refreshingResults = true;
    setRefreshBusy(true);
    let ok = false;
    try {
      if (mode === 'search' && state.search.keyword) {
        ok = await doSearch(state.search.page || 1, state.search.keyword, { fromRefresh: true });
      } else if (mode === 'list') {
        ok = await loadList(state.list.type, state.list.area, state.list.page || 1, {
          fromRefresh: true,
        });
      } else if (mode === 'all' && state.all.items.length) {
        const res = await api('/api/all');
        if (res && res.ok) {
          state.all.items = res.items || state.all.items;
          const pages = Math.max(1, Math.ceil(state.all.items.length / PAGE_SIZE));
          state.all.page = Math.min(state.all.page, pages);
          state.all.loading = false;
          state.all.running = false;
          renderAll();
          ok = true;
        }
      } else if (mode === 'all') {
        doAll();
        ok = true;
      } else {
        const active = document.querySelector('#type-chips .chip.is-active');
        ok = await loadList(active?.dataset.type || '', state.cityArea || 0, 1, {
          fromRefresh: true,
        });
      }
    } catch (err) {
      console.error(err);
      ok = false;
    } finally {
      refreshingResults = false;
      setRefreshBusy(false);
    }
    if (ok) {
      toast(t('toast.refreshed'));
    } else {
      toast(t('toast.refreshFailed'), 'err');
    }
  }

  function setAllScan(on, progress) {
    const strip = $('all-scan');
    if (!strip) return;
    strip.classList.toggle('is-on', !!on);
    const fill = $('all-scan-fill');
    const count = $('all-scan-count');
    const spin = $('all-scan-spin');
    if (!on) {
      strip.classList.remove('is-indeterminate');
      if (spin) spin.style.display = 'none';
      return;
    }
    if (spin) spin.style.display = '';
    const done = Number(progress?.done || 0);
    const total = Number(progress?.total || 0);
    const indeterminate = !total || done <= 0;
    strip.classList.toggle('is-indeterminate', indeterminate);
    if (fill && !indeterminate) fill.style.width = `${Math.min(100, Math.round((done / total) * 100))}%`;
    if (count) {
      count.textContent = state.all.items.length
        ? t('new.total', { n: state.all.items.length })
        : t('new.loadingAll', { extra: '' });
    }
  }

  function finishAllScan(ok) {
    const allBtn = $('btn-all');
    if (state.mode !== 'all') {
      state.all.running = false;
      state.all.loading = false;
      setAllScan(false);
      setBusy(allBtn, false);
      return;
    }
    state.all.running = false;
    state.all.loading = false;
    setAllScan(false);
    setBusy(allBtn, false);
    renderAll();
    if (ok && state.all.items.length) {
      toast(t('toast.allLoaded', { n: state.all.items.length }));
      if (motionOK() && state.mode === 'all') {
        $('results')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    } else {
      toast(t('toast.allFailed'), 'err');
    }
  }

  async function doAll() {
    if (state.all.running) return;
    const allBtn = $('btn-all');
    setBusy(allBtn, true);
    state.mode = 'all';
    state.search.keyword = '';
    const firstLoad = !state.all.items.length;
    state.all.loading = firstLoad;
    state.all.running = true;
    state.all.page = 1;
    if (firstLoad) renderAll();
    setAllScan(true, null);
    const res = await api('/api/all');
    if (!res) {
      finishAllScan(false);
      return;
    }
    state.all.items = res.items || [];
    if (!res.running) {
      finishAllScan(true);
      return;
    }
    setAllScan(true, res.progress);
    const tick = async () => {
      const cur = await api('/api/all');
      if (!cur) {
        finishAllScan(false);
        return;
      }
      state.all.items = cur.items || state.all.items;
      if (cur.running) {
        setAllScan(true, cur.progress);
        setTimeout(tick, 1400);
        return;
      }
      finishAllScan(true);
    };
    setTimeout(tick, 1200);
  }

  // ---------- 页码选择器 ----------
  function pagerState() {
    if (state.mode === 'search') {
      return {
        page: state.search.page || 1,
        pages: Math.max(1, Math.ceil((state.search.items.length || 0) / PAGE_SIZE)),
        total: state.search.items.length || 0,
      };
    }
    if (state.mode === 'list') {
      return {
        page: state.list.page || 1,
        pages: Math.max(1, Math.ceil((state.list.items.length || 0) / PAGE_SIZE)),
        total: state.list.items.length || 0,
      };
    }
    if (state.mode === 'all') {
      return {
        page: state.all.page || 1,
        pages: Math.max(1, Math.ceil((state.all.items.length || 0) / PAGE_SIZE)),
        total: state.all.items.length || 0,
      };
    }
    return { page: 1, pages: 1, total: 0 };
  }

  function setPage(n, options = {}) {
    const info = pagerState();
    if (!info.total) return;
    const page = Math.max(1, Math.min(info.pages, Math.round(Number(n) || 1)));
    if (state.mode === 'search') state.search.page = page;
    else if (state.mode === 'list') state.list.page = page;
    else state.all.page = page;
    if (state.mode === 'search') renderSearch();
    else if (state.mode === 'list') renderList();
    else renderAll();
    closePagePicker();
    if (!options.silent && motionOK()) {
      $('results')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  function pageWindow(current, pages) {
    if (pages <= 12) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, 2, pages - 1, pages, current]);
    for (let d = 1; d <= 2; d += 1) {
      if (current - d > 2) set.add(current - d);
      if (current + d < pages - 1) set.add(current + d);
    }
    const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    const out = [];
    nums.forEach((n, index) => {
      if (index && n - nums[index - 1] > 1) out.push('…');
      out.push(n);
    });
    return out;
  }

  function renderPagePicker() {
    const info = pagerState();
    const grid = $('page-grid');
    const hint = $('page-total-hint');
    if (!grid) return;
    grid.innerHTML = pageWindow(info.page, info.pages)
      .map((n, index) =>
        n === '…'
          ? `<span class="page-cell is-gap">…</span>`
          : `<button type="button" class="page-cell${n === info.page ? ' is-current' : ''}" data-page-cell="${n}" style="--i:${index}">${n}</button>`
      )
      .join('');
    if (hint) {
      hint.textContent =
        state.mode === 'search'
          ? state.search.partial
            ? t('new.pageLimitHint', { n: info.pages })
            : t('new.pageTotalHint', { n: info.pages })
          : state.mode === 'list'
            ? state.list.partial
              ? t('new.pageLimitHint', { n: info.pages })
              : t('new.pageTotalHint', { n: info.pages })
            : t('new.pageTotalHint', { n: info.pages });
    }
    const input = $('page-input');
    if (input) {
      input.max = String(info.pages);
      input.value = String(info.page);
    }
    $('page-last').disabled = info.page >= info.pages;
    $('page-first').disabled = info.page <= 1;
  }

  function positionPagePicker(anchor) {
    const pop = $('page-popover');
    if (!pop || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = pop.offsetWidth || 306;
    const height = pop.offsetHeight || 220;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(12, Math.min(window.innerWidth - width - 12, left));
    let top = rect.bottom + 8;
    let above = false;
    if (top + height > window.innerHeight - 12) {
      top = rect.top - height - 8;
      above = true;
    }
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.max(12, Math.round(top))}px`;
    pop.classList.toggle('is-above', above);
  }

  function openPagePicker() {
    const info = pagerState();
    if (!info.total) return;
    state.pagePicker.open = true;
    state.pagePicker.openedAt = performance.now();
    $('page-btn').setAttribute('aria-expanded', 'true');
    $('page-popover').classList.add('is-open');
    $('page-popover').setAttribute('aria-hidden', 'false');
    renderPagePicker();
    positionPagePicker($('page-btn'));
  }

  function closePagePicker() {
    if (!state.pagePicker.open) return;
    state.pagePicker.open = false;
    $('page-btn').setAttribute('aria-expanded', 'false');
    $('page-popover').classList.remove('is-open');
    $('page-popover').setAttribute('aria-hidden', 'true');
  }

  // ---------- 设置 ----------
  const DESKTOP_KEYS = [
    'desktopMinimizeToTray',
    'desktopCloseToTray',
    'desktopHideTaskbar',
    'desktopHideFullscreen',
  ];
  let desktopStatusTimer = 0;

  function updateDesktopStatus() {
    const status = $('desktop-status-text');
    const dot = $('desktop-status-dot');
    if (!status || !dot) return;
    const native = !!state.meta?.desktop?.native;
    dot.className = native ? 'dot ok' : 'dot';
    if (!status.dataset.busy) status.textContent = t('desktop.instant');
  }

  function fillDesktopSettings() {
    document.querySelectorAll('[data-desktop-key]').forEach((input) => {
      const key = input.dataset.desktopKey;
      if (!DESKTOP_KEYS.includes(key)) return;
      const value = !!state.settings[key];
      input.checked = value;
      input.closest('.desktop-row')?.classList.toggle('is-on', value);
    });
    updateDesktopStatus();
  }

  function flashDesktopApplied() {
    const badge = $('desktop-badge');
    if (badge) {
      badge.classList.remove('is-pop');
      void badge.offsetWidth;
      badge.classList.add('is-pop');
      setTimeout(() => badge.classList.remove('is-pop'), 560);
    }
    const status = $('desktop-status-text');
    const dot = $('desktop-status-dot');
    if (status) {
      status.dataset.busy = '1';
      status.textContent = t('desktop.saved');
      clearTimeout(desktopStatusTimer);
      desktopStatusTimer = setTimeout(() => {
        delete status.dataset.busy;
        updateDesktopStatus();
      }, 1600);
    }
    if (dot) dot.className = 'dot ok';
  }

  async function saveDesktopSetting(input) {
    const key = input.dataset.desktopKey;
    if (!DESKTOP_KEYS.includes(key)) return;
    const value = !!input.checked;
    const row = input.closest('.desktop-row');
    state.settings[key] = value;
    state.desktopPending.add(key);
    row?.classList.toggle('is-on', value);

    const res = await api('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
    state.desktopPending.delete(key);

    if (!res?.ok) {
      state.settings[key] = !value;
      input.checked = !value;
      row?.classList.toggle('is-on', !value);
      toast(t('settings.failed'), 'err');
      return;
    }
    state.settings[key] = !!res.settings[key];
    input.checked = state.settings[key];
    row?.classList.toggle('is-on', state.settings[key]);
    flashDesktopApplied();
  }

  function fillSettings() {
    $('set-interval').value = state.settings.interval;
    $('set-timeout').value = state.settings.timeout;
    $('set-log').checked = !!state.settings.log;
    $('set-lang').value = state.lang;
    updateFpsUI(false);
    applyFpsLimit();
    applyMonetTheme();
    applyEdgeTheme();
    applyFontSettings();
    fillDesktopSettings();
    fillNotifySettings();
    applyMotionLevel(state.settings.motion || 'full');
    loadNotifyCities();
  }

  function fillNotifySettings() {
    if (!$('set-notify-new')) return;
    $('set-notify-new').checked = !!state.settings.notifyNew;
    $('set-notify-sale').checked = !!state.settings.notifySale;
    $('set-notify-city').value = String(state.settings.notifyCity || 0);
    $('set-notify-duration').value = String(Math.round((state.settings.notifyDuration || 6000) / 1000));
    applyNotifyUI();
  }

  function applyNotifyUI() {
    const pos = state.settings.notifyPos || 'br';
    const host = $('notify-host');
    if (host) host.dataset.pos = pos;
    document.querySelectorAll('#notify-pos-picker button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.notifyPos === pos);
    });
    const secs = Math.round((state.settings.notifyDuration || 6000) / 1000);
    const value = $('notify-duration-value');
    if (value) value.textContent = t('settings.notifyDurationValue', { n: secs }) || `${secs} 秒`;
    const readout = $('notify-readout');
    if (readout) {
      const key = pos === 'island' ? 'pos.island' : `pos.${pos}`;
      readout.textContent = `${t(key)} · ${t('settings.notifyDurationValue', { n: secs })}`;
    }
  }

  let notifyCitiesLoaded = false;
  async function loadNotifyCities() {
    if (notifyCitiesLoaded) return;
    const select = $('set-notify-city');
    if (!select) return;
    const res = await api('/api/cities');
    if (!res || !res.ok || !res.items?.length) return;
    notifyCitiesLoaded = true;
    const current = select.value || '0';
    const groups = new Map();
    for (const city of res.items) {
      const letter = city.letter || '#';
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter).push(city);
    }
    const frag = document.createDocumentFragment();
    const all = document.createElement('option');
    all.value = '0';
    all.textContent = t('cat.nationwide');
    frag.appendChild(all);
    for (const [letter, cities] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const group = document.createElement('optgroup');
      group.label = letter;
      for (const city of cities) {
        const option = document.createElement('option');
        option.value = String(city.id);
        option.textContent = city.name;
        group.appendChild(option);
      }
      frag.appendChild(group);
    }
    select.innerHTML = '';
    select.appendChild(frag);
    select.value = String(state.settings.notifyCity || current || 0);
  }

  let notifyPersistTimer = 0;
  function queueNotifyPersist() {
    clearTimeout(notifyPersistTimer);
    notifyPersistTimer = setTimeout(async () => {
      const res = await api('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifyNew: state.settings.notifyNew,
          notifySale: state.settings.notifySale,
          notifyCity: state.settings.notifyCity,
          notifyPos: state.settings.notifyPos,
          notifyDuration: state.settings.notifyDuration,
        }),
      });
      if (res?.ok) state.settings = { ...state.settings, ...res.settings };
    }, 320);
  }

  let motionPersistTimer = 0;
  function queueMotionPersist() {
    clearTimeout(motionPersistTimer);
    motionPersistTimer = setTimeout(async () => {
      const res = await api('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motion: state.settings.motion }),
      });
      if (res?.ok) state.settings = { ...state.settings, ...res.settings };
    }, 260);
  }

  function applyMotionLevel(level) {
    const allowed = ['full', 'soft', 'lite', 'off'];
    const value = allowed.includes(level) ? level : 'full';
    state.settings.motion = value;
    document.documentElement.dataset.motion = value;
    document.documentElement.classList.toggle('motion-skip-boot', value === 'lite' || value === 'off');
    try {
      localStorage.setItem('iqx.motion', value);
    } catch (err) {}
    document.querySelectorAll('#motion-picker button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.motion === value);
    });
    const label = $('motion-readout');
    const names = { full: 'settings.motionFull', soft: 'settings.motionSoft', lite: 'settings.motionLite', off: 'settings.motionOff' };
    if (label) label.textContent = t(names[value]);
    if (value === 'lite' || value === 'off') dismissBoot();
  }

  let fpsPersistTimer = 0;

  function queueFpsPersist() {
    state.fpsDirty = true;
    clearTimeout(fpsPersistTimer);
    fpsPersistTimer = setTimeout(async () => {
      const res = await api('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fps: state.settings.fps,
          fpsUnlimited: state.settings.fpsUnlimited,
          fpsMax: state.settings.fpsMax,
        }),
      });
      if (res?.ok) {
        state.fpsDirty = false;
        state.settings.fps = res.settings.fps;
        state.settings.fpsUnlimited = res.settings.fpsUnlimited;
        state.settings.fpsMax = res.settings.fpsMax;
      }
    }, 350);
  }

  async function saveSettings() {
    const saveBtn = $('btn-save');
    clearTimeout(fpsPersistTimer);
    clearTimeout(monetPersistTimer);
    const payload = {
      interval: Number($('set-interval').value) || 2,
      timeout: Number($('set-timeout').value) || 10,
      log: $('set-log').checked,
      theme: state.settings.theme,
      language: state.lang,
      fps: state.settings.fps,
      fpsUnlimited: state.settings.fpsUnlimited,
      fpsMax: state.settings.fpsMax,
      monet: state.settings.monet,
      monetSeed: state.settings.monetSeed,
      edgeColor: state.settings.edgeColor,
      fontFamily: state.settings.fontFamily,
      fontSize: state.settings.fontSize,
      fontWeight: state.settings.fontWeight,
      notifyNew: state.settings.notifyNew,
      notifySale: state.settings.notifySale,
      notifyCity: state.settings.notifyCity,
      notifyPos: state.settings.notifyPos,
      notifyDuration: state.settings.notifyDuration,
      motion: state.settings.motion,
    };
    setBusy(saveBtn, true);
    try {
      const res = await api('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res?.ok) {
        state.settings = { ...state.settings, ...res.settings };
        state.fpsDirty = false;
        state.monetDirty = false;
        state.edgeDirty = false;
        state.fontDirty = false;
        updateFpsUI(false);
        applyFpsLimit();
        applyMonetTheme();
        applyEdgeTheme();
        applyFontSettings();
        fillNotifySettings();
        applyMotionLevel(state.settings.motion || 'full');
        $('save-hint').textContent = t('settings.saved');
        setTimeout(() => ($('save-hint').textContent = ''), 2500);
      } else {
        toast(t('settings.failed'), 'err');
      }
    } finally {
      setBusy(saveBtn, false);
    }
  }

  function updateStatus() {
    $('status-text').textContent = state.tasks.length ? t('status.monitoring') : t('status.ready');
    $('status-tasks').textContent = t('status.tasks', { n: state.tasks.length });
  }

  function pulseContent() {
    if (!motionOK()) return;
    const content = document.querySelector('.content:not(.is-hidden)');
    if (!content) return;
    content.classList.remove('is-refreshing');
    void content.offsetWidth;
    content.classList.add('is-refreshing');
    setTimeout(() => content.classList.remove('is-refreshing'), 520);
  }

  // ---------- 状态轮询 ----------
  let primed = false;
  let refreshing = false;

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const data = await api('/api/state');
      if (!data) {
        if ($('status-dot').className !== 'dot err') $('status-dot').className = 'dot err';
        $('status-text').textContent = t('status.offline');
        return;
      }
      state.online = true;
      state.tasks = data.tasks || [];
      const incoming = { ...(data.settings || {}) };
      if (state.fpsDirty) {
        delete incoming.fps;
        delete incoming.fpsUnlimited;
        delete incoming.fpsMax;
      }
      if (state.monetDirty) {
        delete incoming.monet;
        delete incoming.monetSeed;
      }
      if (state.edgeDirty) delete incoming.edgeColor;
      if (state.fontDirty) {
        delete incoming.fontFamily;
        delete incoming.fontSize;
        delete incoming.fontWeight;
      }
      for (const key of state.desktopPending) delete incoming[key];
      state.settings = { ...state.settings, ...incoming };
      state.meta = data.meta || state.meta;

      if (
        state.settings.monet !== monetApplied ||
        normalizeMonetSeed(state.settings.monetSeed) !== monetAppliedSeed
      ) {
        applyMonetTheme();
      }

      if (!primed) {
        primed = true;
        fillSettings();
        if (!localStorage.getItem('iqx.lang') && state.settings.language && LANGS.includes(state.settings.language)) {
          state.lang = state.settings.language;
          applyI18n();
        }
        if (!localStorage.getItem('iqx.theme') && THEMES.includes(state.settings.theme)) {
          applyTheme(state.settings.theme);
        }
        renderAbout();
      }

      if ($('status-dot').className !== 'dot ok') $('status-dot').className = 'dot ok';
      updateStatus();
      $('status-time').textContent = hhmmss(Date.now() / 1000);
      updateFpsUI(false);
      applyFpsLimit();
      if (
        state.settings.monet !== monetApplied ||
        normalizeMonetSeed(state.settings.monetSeed) !== monetAppliedSeed
      ) {
        applyMonetTheme();
      }
      fillDesktopSettings();
      renderTasks();
    } finally {
      refreshing = false;
      dismissBoot();
    }
  }

  function renderAbout() {
    const meta = state.meta || {};
    $('about-name').textContent = meta.name || 'Infinite query X';
    $('about-version-line').textContent = `v${meta.version || '1.0.0'}${
      meta.build ? ` · build ${meta.build}` : ''
    }`;
    $('about-author').textContent = meta.author || '小羅同学';
    const github = String(meta.github || '').trim();
    const githubRow = $('about-github-row');
    const githubLink = $('about-github');
    const githubText = $('about-github-text');
    if (githubRow && githubLink && githubText) {
      githubRow.hidden = !github;
      if (github) {
        githubLink.href = github;
        githubLink.title = github;
        githubText.textContent = github.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
      }
    }
    const bootVersion = $('boot-version');
    if (bootVersion) bootVersion.textContent = `v${meta.version || '1.0.0'}`;
    document.title = `${meta.name || 'Infinite query X'} ${meta.version || ''}`.trim();
  }

  // ---------- 日期查询 ----------
  function localISODate(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseISODate(day) {
    const [y, m, d] = String(day || '').split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  }

  function shiftISODate(day, delta) {
    const date = parseISODate(day);
    date.setDate(date.getDate() + delta);
    return localISODate(date);
  }

  function formatDayLabel(day, withToday = true) {
    if (!day) return '';
    const date = parseISODate(day);
    const dateText = new Intl.DateTimeFormat(state.lang, {
      month: 'long',
      day: 'numeric',
    }).format(date);
    const week = new Intl.DateTimeFormat(state.lang, { weekday: 'short' }).format(date);
    const text = `${dateText} · ${week}`;
    return withToday && day === localISODate() ? `${t('new.dateToday')} · ${text}` : text;
  }

  function dateCategoryLabel(category) {
    return t(DATE_CAT_KEY[category] || 'new.dateOther');
  }

  function dateRangeText(item) {
    const start = String(item.date || '').slice(0, 10);
    const end = String(item.endDate || start).slice(0, 10);
    if (!start || start === '-') return '-';
    return end && end !== start ? t('new.dateRange', { a: start, b: end }) : start;
  }

  function monthKey(day) {
    return String(day || localISODate()).slice(0, 7);
  }

  function positionDatePicker(anchor) {
    const pop = $('date-popover');
    if (!pop || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = pop.offsetWidth || 312;
    const height = pop.offsetHeight || 330;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(12, Math.min(window.innerWidth - width - 12, left));
    let top = rect.bottom + 8;
    let above = false;
    if (top + height > window.innerHeight - 12) {
      top = rect.top - height - 8;
      above = true;
    }
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.max(12, Math.round(top))}px`;
    pop.classList.toggle('is-above', above);
  }

  function renderCalendar(direction = '') {
    const grid = $('cal-grid');
    const title = $('cal-title');
    const weekdays = $('cal-weekdays');
    if (!grid || !title || !weekdays) return;
    const month = parseISODate(`${monthKey(state.datePicker.month || state.date)}-01`);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    title.textContent = new Intl.DateTimeFormat(state.lang, { year: 'numeric', month: 'long' }).format(month);

    weekdays.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(2024, 0, 1 + index, 12, 0, 0);
      return `<span>${esc(new Intl.DateTimeFormat(state.lang, { weekday: 'narrow' }).format(day))}</span>`;
    }).join('');

    const first = new Date(year, monthIndex, 1, 12, 0, 0);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, monthIndex, 1 - offset, 12, 0, 0);
    const today = localISODate();
    const selected = state.date;
    grid.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const day = localISODate(date);
      const classes = ['cal-day'];
      if (date.getMonth() !== monthIndex) classes.push('is-out');
      if (day === today) classes.push('is-today');
      if (day === selected) classes.push('is-selected');
      return `<button type="button" class="${classes.join(' ')}" data-cal-day="${day}" style="--i:${index}">${date.getDate()}</button>`;
    }).join('');

    const label = $('cal-selected-label');
    if (label) label.textContent = formatDayLabel(selected, false);

    grid.classList.remove('is-next', 'is-prev', 'is-flipping');
    void grid.offsetWidth;
    if (direction === 'next') grid.classList.add('is-next');
    else if (direction === 'prev') grid.classList.add('is-prev');
    else grid.classList.add('is-flipping');
    setTimeout(() => grid.classList.remove('is-next', 'is-prev', 'is-flipping'), 360);
  }

  function openDatePicker(anchorId) {
    const anchor = $(anchorId);
    if (!anchor) return;
    state.datePicker.open = true;
    state.datePicker.anchor = anchorId;
    state.datePicker.month = monthKey(state.date);
    anchor.setAttribute('aria-expanded', 'true');
    const pop = $('date-popover');
    if (!pop) return;
    pop.classList.add('is-open');
    pop.setAttribute('aria-hidden', 'false');
    renderCalendar('');
    positionDatePicker(anchor);
  }

  function closeDatePicker() {
    state.datePicker.open = false;
    const pop = $('date-popover');
    if (pop) {
      pop.classList.remove('is-open');
      pop.setAttribute('aria-hidden', 'true');
    }
    document.querySelectorAll('.date-trigger').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function selectCalendarDay(day) {
    const fromWindow = state.datePicker.anchor === 'date-window-trigger' || $('date-window').classList.contains('is-open');
    state.date = day;
    syncDateUI();
    closeDatePicker();
    if (fromWindow) loadDate(day);
    else openDateWindow(day);
  }

  function shiftPickerMonth(delta) {
    const [year, month] = monthKey(state.datePicker.month || state.date).split('-').map(Number);
    const date = new Date(year, (month || 1) - 1 + delta, 1, 12, 0, 0);
    state.datePicker.month = localISODate(date).slice(0, 7);
    renderCalendar(delta > 0 ? 'next' : 'prev');
  }

  function shortDateLabel(day) {
    return new Intl.DateTimeFormat(state.lang, { month: 'numeric', day: 'numeric' }).format(parseISODate(day));
  }

  function syncDateUI() {
    const day = state.date || localISODate();
    state.date = day;
    const label = $('date-query-label');
    if (label) label.textContent = formatDayLabel(day);
    const short = shortDateLabel(day);
    const triggerLabel = $('date-trigger-label');
    if (triggerLabel) triggerLabel.textContent = short;
    const windowTriggerLabel = $('date-window-trigger-label');
    if (windowTriggerLabel) windowTriggerLabel.textContent = short;
    const title = $('date-window-title');
    if (title) title.textContent = formatDayLabel(day);
    if (!state.datePayload) {
      const sub = $('date-window-sub');
      if (sub) sub.textContent = t('new.dateWindowSub', { n: 0 });
    }
  }

  function openDateWindow(day) {
    state.date = day || state.date || localISODate();
    const win = $('date-window');
    if (!win) return;
    syncDateUI();
    win.classList.add('is-open');
    win.setAttribute('aria-hidden', 'false');
    document.body.classList.add('date-window-open');
    loadDate(state.date);
  }

  function closeDateWindow() {
    state.dateToken += 1;
    const win = $('date-window');
    if (win) {
      win.classList.remove('is-open');
      win.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('date-window-open');
  }

  function dateEventCard(item) {
    const range = dateRangeText(item);
    const status = statusLabel(item.status);
    return `<article class="date-event">
      <div class="date-event-main">
        <div class="date-event-top">
          <span class="date-event-cat">${esc(dateCategoryLabel(item.category))}</span>
          <h3>${esc(item.name)}</h3>
          <span class="pill ${pillClass(item.status)}">${esc(status || '-')}</span>
        </div>
        <div class="date-event-meta">
          <span>${esc(item.city || '-')}</span>
          <span>${esc(range)}</span>
          ${item.venue ? `<span>${esc(item.venue)}</span>` : ''}
          <span>${esc(item.price || '-')}</span>
        </div>
      </div>
      <div class="date-event-actions">
        <a class="link" href="${esc(item.url || DETAIL_URL(item.id))}" target="_blank" rel="noreferrer">${t('row.link')}</a>
        <button type="button" class="btn tiny" data-watch="${esc(item.id)}" data-name="${esc(item.name)}">${t('new.watch')}</button>
      </div>
    </article>`;
  }

  function renderDateWindow(payload) {
    state.datePayload = payload;
    const body = $('date-window-body');
    const tabs = $('date-tabs');
    const sub = $('date-window-sub');
    const status = $('date-window-status');
    if (!body || !tabs) return;

    const items = payload.items || [];
    const counts = new Map();
    for (const item of items) {
      const cat = item.category || '其他';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const countFor = (tab) => {
      if (tab === 'all') return items.length;
      if (tab === '其他') {
        return items.filter((item) => !['展览', '演出', '赛事', '同人展'].includes(item.category || '其他')).length;
      }
      return counts.get(tab) || 0;
    };

    tabs.innerHTML = DATE_TABS.map(
      (tab) => `<button type="button" class="date-tab${state.dateTab === tab ? ' is-active' : ''}" data-date-tab="${tab}">
        <span>${esc(t(DATE_CAT_KEY[tab]))}</span><b>${countFor(tab)}</b>
      </button>`
    ).join('');

    if (sub) sub.textContent = t('new.dateWindowSub', { n: items.length });

    const filtered =
      state.dateTab === 'all'
        ? items
        : state.dateTab === '其他'
          ? items.filter((item) => !['展览', '演出', '赛事', '同人展'].includes(item.category || '其他'))
          : items.filter((item) => (item.category || '其他') === state.dateTab);

    if (payload.loading && !items.length) {
      body.innerHTML = `<div class="date-loading"><span class="spin"></span> ${esc(
        payload.first ? t('new.dateLoadingFirst') : t('new.dateLoading')
      )}</div>${skeletonList(4)}`;
    } else if (!filtered.length) {
      body.innerHTML = `<div class="empty date-empty">${emptyArt()}<h3>${esc(t('new.dateEmpty'))}</h3><p>${esc(
        t('new.dateEmptyHint')
      )}</p></div>`;
    } else {
      body.innerHTML = `<div class="date-event-list">${filtered.map(dateEventCard).join('')}</div>`;
      bindWatchButtons(body, () => closeDateWindow());
    }

    if (status) {
      if (payload.loading) {
        status.textContent = payload.first ? t('new.dateLoadingFirst') : t('new.dateLoading');
      } else if (payload.error) {
        status.textContent = payload.error;
      } else if (payload.updated) {
        status.textContent = t('new.dateUpdated', { time: hhmmss(payload.updated / 1000) });
      } else {
        status.textContent = '';
      }
    }
    const title = $('date-window-title');
    if (title) title.textContent = formatDayLabel(state.date);
  }

  async function loadDate(day, options = {}) {
    if (!day) return;
    state.date = day;
    syncDateUI();
    const token = ++state.dateToken;
    const cached = state.dateCache.get(day);
    renderDateWindow({
      items: cached?.items || [],
      loading: true,
      first: !cached,
      updated: cached?.updated || 0,
    });
    const res = await api(`/api/date?date=${encodeURIComponent(day)}${options.refresh ? '&refresh=1' : ''}`);
    if (token !== state.dateToken) return;
    if (!res?.ok) {
      renderDateWindow({
        items: cached?.items || [],
        loading: false,
        first: !cached,
        updated: cached?.updated || 0,
        error: res?.error || t('toast.searchFailed'),
      });
      return;
    }
    const payload = {
      items: res.items || [],
      running: !!res.running,
      loading: !!res.running,
      first: false,
      updated: Date.now(),
    };
    state.dateCache.set(day, payload);
    renderDateWindow(payload);
    if (!res.running) return;

    let attempts = 0;
    const poll = async () => {
      if (token !== state.dateToken) return;
      attempts += 1;
      if (attempts > 60) return;
      await sleep(900);
      if (token !== state.dateToken) return;
      const cur = await api(`/api/date?date=${encodeURIComponent(day)}`);
      if (token !== state.dateToken) return;
      if (!cur?.ok) return;
      const next = {
        items: cur.items || [],
        running: !!cur.running,
        loading: !!cur.running,
        first: false,
        updated: Date.now(),
      };
      state.dateCache.set(day, next);
      renderDateWindow(next);
      if (cur.running) poll();
      else syncDateUI();
    };
    poll();
  }

  // ---------- 初始化 ----------
  function updateScrollState() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    document.documentElement.style.setProperty('--scroll', progress.toFixed(4));
    document.body.classList.toggle('is-scrolled', window.scrollY > 6);
  }

  function initMotion() {
    let cancelScrollFrame = null;
    const scheduleScroll = () => {
      if (cancelScrollFrame) return;
      cancelScrollFrame = requestUiFrame(() => {
        cancelScrollFrame = null;
        updateScrollState();
      });
    };

    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', () => {
      scheduleScroll();
      moveNavGlide();
      moveThemeThumb();
    });
    updateScrollState();

    let cancelPointerFrame = null;
    let pointer = null;
    document.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType === 'touch' || !motionOK()) return;
        pointer = { x: event.clientX, y: event.clientY, target: event.target };
        if (cancelPointerFrame) return;
        cancelPointerFrame = requestUiFrame(() => {
          cancelPointerFrame = null;
          if (!pointer) return;
          const host = pointer.target?.closest?.('.task, .row-card, .stat, .card');
          if (!host) return;
          const rect = host.getBoundingClientRect();
          const mx = ((pointer.x - rect.left) / Math.max(1, rect.width)) * 100;
          const my = ((pointer.y - rect.top) / Math.max(1, rect.height)) * 100;
          host.style.setProperty('--mx', `${mx.toFixed(1)}%`);
          host.style.setProperty('--my', `${my.toFixed(1)}%`);
        });
      },
      { passive: true }
    );

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        moveNavGlide();
        moveThemeThumb();
      });
      if ($('nav')) observer.observe($('nav'));
      if ($('theme-switch')) observer.observe($('theme-switch'));
    }

    MOTION_QUERY.addEventListener?.('change', () => {
      if (MOTION_QUERY.matches) dismissBoot();
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
      if (monetCache && $('monet-field')) {
        updateMonetPreview(monetCache);
        updateMetaThemeColor();
      }
    });
  }

  function init() {
    const storedMotion = localStorage.getItem('iqx.motion');
    applyMotionLevel(storedMotion || state.settings.motion || 'full');

    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    document.querySelectorAll('#theme-switch button').forEach((btn) => {
      btn.addEventListener('click', (event) => chooseTheme(btn.dataset.themeValue, event));
    });

    $('lang').addEventListener('change', (e) => setLanguage(e.target.value, true));
    $('set-lang').addEventListener('change', (e) => setLanguage(e.target.value, true));

    $('btn-search').addEventListener('click', () => doSearch(1));
    $('kw').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch(1);
    });
    $('btn-all').addEventListener('click', doAll);
    $('btn-refresh').addEventListener('click', refreshResults);

    $('prev-page').addEventListener('click', () => setPage(pagerState().page - 1));
    $('next-page').addEventListener('click', () => setPage(pagerState().page + 1));
    $('page-btn').addEventListener('click', () => {
      if (state.pagePicker.open) closePagePicker();
      else openPagePicker();
    });
    $('page-grid').addEventListener('click', (event) => {
      const cell = event.target.closest('[data-page-cell]');
      if (cell) setPage(Number(cell.dataset.pageCell));
    });
    $('page-first').addEventListener('click', () => setPage(1));
    $('page-last').addEventListener('click', () => setPage(pagerState().pages));
    $('page-go').addEventListener('click', () => setPage(Number($('page-input').value) || 1));
    $('page-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') setPage(Number($('page-input').value) || 1);
    });
    document.addEventListener('pointerdown', (event) => {
      if (!state.pagePicker.open) return;
      if (event.target.closest('#page-popover, #page-btn')) return;
      closePagePicker();
    });
    window.addEventListener('resize', () => {
      if (!state.pagePicker.open) return;
      positionPagePicker($('page-btn'));
    });
    window.addEventListener('scroll', () => {
      if (performance.now() - (state.pagePicker.openedAt || 0) < 400) return;
      closePagePicker();
    }, true);

    document.querySelectorAll('#type-chips .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#type-chips .chip').forEach((c) => c.classList.toggle('is-active', c === chip));
        loadList(chip.dataset.type || '', state.cityArea || 0, 1);
      });
    });

    $('city-trigger').addEventListener('click', () => {
      if (state.cityPicker.open) closeCityPicker();
      else openCityPicker();
    });
    let cityFilterTimer = 0;
    $('city-search').addEventListener('input', (event) => {
      state.cityPicker.filter = event.target.value || '';
      clearTimeout(cityFilterTimer);
      cityFilterTimer = setTimeout(renderCityList, 60);
    });
    const pickCity = (event) => {
      const button = event.target.closest('[data-city-id]');
      if (button) selectCity(button.dataset.cityId, button.dataset.cityName);
    };
    $('city-all').addEventListener('click', pickCity);
    $('city-groups').addEventListener('click', pickCity);
    document.addEventListener('pointerdown', (event) => {
      if (!state.cityPicker.open) return;
      if (event.target.closest('#city-popover, #city-trigger')) return;
      closeCityPicker();
    });
    window.addEventListener('resize', () => {
      if (state.cityPicker.open) positionCityPicker($('city-trigger'));
    });
    window.addEventListener('scroll', () => {
      if (!state.cityPicker.open) return;
      if (performance.now() - (state.cityPicker.openedAt || 0) < 400) return;
      closeCityPicker();
    }, true);

    $('btn-save').addEventListener('click', saveSettings);

    $('set-notify-new').addEventListener('change', (event) => {
      state.settings.notifyNew = !!event.target.checked;
      applyNotifyUI();
      queueNotifyPersist();
    });
    $('set-notify-sale').addEventListener('change', (event) => {
      state.settings.notifySale = !!event.target.checked;
      applyNotifyUI();
      queueNotifyPersist();
    });
    $('set-notify-city').addEventListener('change', (event) => {
      state.settings.notifyCity = Number(event.target.value) || 0;
      queueNotifyPersist();
    });
    $('notify-pos-picker').addEventListener('click', (event) => {
      const button = event.target.closest('[data-notify-pos]');
      if (!button) return;
      state.settings.notifyPos = button.dataset.notifyPos;
      applyNotifyUI();
      queueNotifyPersist();
    });
    $('set-notify-duration').addEventListener('input', (event) => {
      const secs = Math.max(3, Math.min(15, Number(event.target.value) || 6));
      state.settings.notifyDuration = secs * 1000;
      applyNotifyUI();
    });
    $('set-notify-duration').addEventListener('change', () => queueNotifyPersist());
    $('btn-notify-test').addEventListener('click', async () => {
      const button = $('btn-notify-test');
      setBusy(button, true);
      const res = await api('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'new' }),
      });
      setBusy(button, false);
      if (res?.ok) {
        $('notify-test-hint').textContent = t('settings.notifyTestSent');
        setTimeout(() => ($('notify-test-hint').textContent = ''), 2600);
      } else {
        toast(t('toast.notifyPreviewFailed'), 'err');
      }
    });
    $('motion-picker').addEventListener('click', (event) => {
      const button = event.target.closest('[data-motion]');
      if (!button) return;
      applyMotionLevel(button.dataset.motion);
      queueMotionPersist();
    });

    $('set-fps').addEventListener('input', (event) => {
      state.settings.fps = clampFps(event.target.value, state.fpsMax || state.settings.fpsMax || 60);
      state.settings.fpsUnlimited = false;
      state.fpsDirty = true;
      updateFpsUI(false);
      applyFpsLimit();
    });
    $('set-fps').addEventListener('change', () => {
      updateFpsUI(true);
      queueFpsPersist();
    });
    $('set-fps-unlimited').addEventListener('change', (event) => {
      state.settings.fpsUnlimited = !!event.target.checked;
      state.fpsDirty = true;
      updateFpsUI(true);
      applyFpsLimit();
      queueFpsPersist();
    });
    $('btn-fps-detect').addEventListener('click', () => detectRefreshRate());

    $('set-monet').addEventListener('change', (event) => setMonetEnabled(event.target.checked));
    $('monet-seed').addEventListener('input', (event) => {
      setMonetSeed(event.target.value, { enable: true, persist: false });
    });
    $('monet-seed').addEventListener('change', () => queueMonetPersist());
    $('btn-monet-eyedropper').addEventListener('click', pickMonetFromScreen);
    $('btn-monet-image').addEventListener('click', () => $('monet-image').click());
    $('monet-image').addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) pickMonetFromImage(file);
      event.target.value = '';
    });
    document.querySelectorAll('#monet-presets button').forEach((button) => {
      button.addEventListener('click', () => setMonetSeed(button.dataset.monetColor));
    });

    $('set-edge-color').addEventListener('input', (event) => {
      setEdgeColor(event.target.value, { persist: false });
    });
    $('set-edge-color').addEventListener('change', (event) => setEdgeColor(event.target.value));
    document.querySelectorAll('#edge-presets [data-edge-color]').forEach((button) => {
      button.addEventListener('click', () => setEdgeColor(button.dataset.edgeColor));
    });

    $('set-font-family').addEventListener('change', (event) => setFontSetting('fontFamily', event.target.value));
    $('set-font-size').addEventListener('input', (event) => setFontSetting('fontSize', event.target.value));
    $('set-font-weight').addEventListener('change', (event) => setFontSetting('fontWeight', event.target.value));
    $('btn-font-add').addEventListener('click', () => $('font-file').click());
    $('font-file').addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) uploadFont(file);
    });
    $('font-custom-list').addEventListener('click', (event) => {
      const use = event.target.closest('[data-font-use]');
      if (use) {
        setFontSetting('fontFamily', `custom:${use.dataset.fontUse}`);
        return;
      }
      const remove = event.target.closest('[data-font-delete]');
      if (remove) deleteFont(remove.dataset.fontDelete);
    });

    const stepDate = (delta) => {
      state.date = shiftISODate(state.date || localISODate(), delta);
      syncDateUI();
      if ($('date-window').classList.contains('is-open')) loadDate(state.date);
    };
    $('date-prev').addEventListener('click', () => stepDate(-1));
    $('date-next').addEventListener('click', () => stepDate(1));
    $('date-trigger').addEventListener('click', () => {
      if (state.datePicker.open && state.datePicker.anchor === 'date-trigger') closeDatePicker();
      else openDatePicker('date-trigger');
    });
    $('date-window-trigger').addEventListener('click', () => {
      if (state.datePicker.open && state.datePicker.anchor === 'date-window-trigger') closeDatePicker();
      else openDatePicker('date-window-trigger');
    });
    $('cal-prev').addEventListener('click', () => shiftPickerMonth(-1));
    $('cal-next').addEventListener('click', () => shiftPickerMonth(1));
    $('cal-grid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-cal-day]');
      if (button) selectCalendarDay(button.dataset.calDay);
    });
    $('cal-today').addEventListener('click', () => selectCalendarDay(localISODate()));
    document.addEventListener('pointerdown', (event) => {
      if (!state.datePicker.open) return;
      if (event.target.closest('#date-popover, .date-trigger')) return;
      closeDatePicker();
    });
    window.addEventListener('resize', () => {
      if (!state.datePicker.open) return;
      const anchor = $(state.datePicker.anchor);
      if (anchor) positionDatePicker(anchor);
    });
    window.addEventListener('scroll', () => closeDatePicker(), true);
    $('date-today').addEventListener('click', () => {
      state.date = localISODate();
      syncDateUI();
      if ($('date-window').classList.contains('is-open')) loadDate(state.date);
    });
    $('date-open').addEventListener('click', () => openDateWindow(state.date));
    $('date-window-prev').addEventListener('click', () => {
      state.date = shiftISODate(state.date || localISODate(), -1);
      syncDateUI();
      loadDate(state.date);
    });
    $('date-window-next').addEventListener('click', () => {
      state.date = shiftISODate(state.date || localISODate(), 1);
      syncDateUI();
      loadDate(state.date);
    });
    $('date-window-close').addEventListener('click', closeDateWindow);
    $('date-backdrop').addEventListener('click', closeDateWindow);
    $('date-window-refresh').addEventListener('click', () => loadDate(state.date, { refresh: true }));
    $('date-tabs').addEventListener('click', (event) => {
      const button = event.target.closest('[data-date-tab]');
      if (!button) return;
      state.dateTab = button.dataset.dateTab;
      if (state.datePayload) renderDateWindow(state.datePayload);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (state.datePicker.open) {
        closeDatePicker();
        return;
      }
      if ($('date-window').classList.contains('is-open')) closeDateWindow();
      if (state.pagePicker.open) closePagePicker();
      if (state.cityPicker.open) closeCityPicker();
    });

    document.querySelectorAll('[data-desktop-key]').forEach((input) => {
      input.addEventListener('change', () => saveDesktopSetting(input));
    });

    document.querySelectorAll('[data-help-tab]').forEach((button) => {
      button.addEventListener('click', () => setHelpTab(button.dataset.helpTab));
    });
    $('help-steps').addEventListener('click', (event) => {
      const button = event.target.closest('[data-help-step]');
      if (!button) return;
      helpState.index = Number(button.dataset.helpStep) || 0;
      renderHelpStep();
      startHelpTimer();
    });
    $('help-demo-prev').addEventListener('click', () => {
      const count = helpCopy().steps.length;
      helpState.index = (helpState.index - 1 + count) % count;
      renderHelpStep();
      startHelpTimer();
    });
    $('help-demo-next').addEventListener('click', () => {
      const count = helpCopy().steps.length;
      helpState.index = (helpState.index + 1) % count;
      renderHelpStep();
      startHelpTimer();
    });
    $('help-demo-play').addEventListener('click', () => {
      helpState.playing = !helpState.playing;
      if (helpState.playing) {
        renderHelpStep(true);
        startHelpTimer();
      } else {
        stopHelpTimer();
        syncHelpPlayback();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopHelpTimer();
      } else {
        if (state.view === 'help') startHelpTimer();
        if (state.fpsState === 'idle' || state.fpsState === 'failed') {
          detectRefreshRate();
        }
      }
    });

    const storedTheme = localStorage.getItem('iqx.theme');
    if (THEMES.includes(storedTheme)) state.settings.theme = storedTheme;
    state.date = localISODate();
    syncDateUI();
    applyFontSettings();
    applyTheme(THEMES.includes(storedTheme) ? storedTheme : 'system');
    applyI18n();
    initMotion();
    watchFlow();
    loadFonts();
    switchView('tasks', { force: true, animate: false });
    requestAnimationFrame(() => {
      moveNavGlide();
      moveThemeThumb();
    });
    window.addEventListener('load', () => {
      moveNavGlide();
      moveThemeThumb();
    });

    loadCities();
    refresh();
    applyFpsLimit();
    updateFpsUI(false);
    setTimeout(() => detectRefreshRate(), 700);
    setTimeout(dismissBoot, BOOT_MAX_MS);
    setInterval(refresh, 2000);
    setInterval(tickLive, 1000);
    pollNotifications();
    setInterval(pollNotifications, 1800);
    setInterval(() => {
      $('status-time').textContent = hhmmss(Date.now() / 1000);
    }, 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
