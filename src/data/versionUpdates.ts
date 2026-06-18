import type { BilingualText } from '../types/route'

export interface VersionUpdateEntry {
  id: string
  date: string
  title: BilingualText
  items?: BilingualText[]
  /** 合并条目时可保留多个小节标题 */
  groups?: { title: BilingualText; items: BilingualText[] }[]
  /** 条目底部彩蛋（密文 + 解码提示） */
  easterEgg?: boolean
  easterEggTitle?: BilingualText
  easterEggHex?: string
}

export const versionUpdates: VersionUpdateEntry[] = [
  {
    id: '2026-06-18-folders',
    date: '2026-06-18',
    title: {
      zh: '2026-06-18 更新（收藏夹与分享）',
      en: '2026-06-18 updates (folders & sharing)',
    },
    groups: [
      {
        title: { zh: '收藏夹', en: 'Favorite folders' },
        items: [
          {
            zh: '收藏支持多个自定义收藏夹：列表区分页签切换，点 + 可新建；星标按钮可选择加入哪些收藏夹。',
            en: 'Favorites now support multiple custom folders—switch tabs in the list, tap + to create one, and use the star to pick folders.',
          },
          {
            zh: '导出/导入收藏移至收藏区分页旁，不再放在设置里。',
            en: 'Export/import moved next to the favorites tabs instead of Settings.',
          },
        ],
      },
      {
        title: { zh: '搜索与分享', en: 'Search & share' },
        items: [
          {
            zh: '搜索框支持 zone:3、op:FT、type:express、-night 等语法（可与关键词组合）。',
            en: 'Search supports zone:3, op:FT, type:express, -night, etc., combined with free text.',
          },
          {
            zh: '线路详情新增「分享线路」，链接包含当前方向（?route=…&dir=…）。',
            en: 'Route detail adds “Share route” with the current direction in the URL (?route=…&dir=…).',
          },
        ],
      },
    ],
  },
  {
    id: '2026-06-18-summary',
    date: '2026-06-18',
    title: {
      zh: '2026-06-18 更新',
      en: '2026-06-18 updates',
    },
    groups: [
      {
        title: {
          zh: '更新日志弹窗',
          en: 'Change log prompt',
        },
        items: [
          {
            zh: '首次进入线路首页且未查看过更新页时，在关闭每日挑战提示后会弹出近期更新摘要；也可点「查看全部更新」进入完整更新页。',
            en: 'On your first visit to the routes home (if you have not opened the change log yet), a summary appears after you dismiss the daily challenge prompt; tap “View full change log” for the full page.',
          },
        ],
      },
      {
        title: {
          zh: '紧凑列表',
          en: 'Compact list density',
        },
        items: [
          {
            zh: '设置中的「紧凑」列表密度进一步缩小卡片内边距、字号与分组间距，同屏可显示更多线路。',
            en: '“Compact” list density in Settings is tighter—smaller card padding, type, and group spacing so more routes fit on screen.',
          },
        ],
      },
    ],
  },
  {
    id: '2026-06-17-summary',
    date: '2026-06-17',
    title: {
      zh: '2026-06-17 更新',
      en: '2026-06-17 updates',
    },
    groups: [
      {
        title: {
          zh: '收藏排序与设置恢复',
          en: 'Favorite ordering & settings reset',
        },
        items: [
          {
            zh: '收藏线路支持拖拽排序，顺序会写入本地并在刷新后保持一致。',
            en: 'Favorites now support drag-and-drop ordering; order is saved locally and persists after reload.',
          },
          {
            zh: '设置面板新增「恢复默认设置」，可一键清空主题、语言、收藏、最近查看、筛选、分组状态、搜索历史与显示偏好。',
            en: 'Settings now include “Reset all settings” to clear theme, language, favorites, recent routes, filters, group states, search history, and display preferences.',
          },
        ],
      },
      {
        title: {
          zh: '设置面板滚动',
          en: 'Settings panel scrolling',
        },
        items: [
          {
            zh: '修复设置面板在小屏和内容较多时超出屏幕的问题，面板可在视口内纵向滚动查看完整内容。',
            en: 'Fixed settings panel overflow on smaller screens or larger content; the panel now scrolls vertically within the viewport.',
          },
        ],
      },
    ],
  },
  {
    id: '2026-06-15-summary',
    date: '2026-06-15',
    title: {
      zh: '2026-06-15 更新',
      en: '2026-06-15 updates',
    },
    groups: [
      {
        title: {
          zh: '收藏线路',
          en: 'Favorite routes',
        },
        items: [
          {
            zh: '线路卡片与详情页可点星标收藏，偏好写入本地存储。',
            en: 'Star routes on list cards or in the detail view; favorites are saved locally.',
          },
          {
            zh: '「收藏线路」为可折叠分组，位于今日每日挑战下方、常规路线上方；收藏的线路仍保留在原有分组中显示。',
            en: '“Favorites” is a collapsible section below Today’s daily challenge and above Regular routes; favorited routes still appear in their original groups.',
          },
        ],
      },
      {
        title: {
          zh: '设置面板',
          en: 'Settings panel',
        },
        items: [
          {
            zh: '外观切换（跟随系统 / 深色 / 浅色）移入设置菜单，顶栏仅保留齿轮按钮。',
            en: 'Appearance (System / Dark / Light) moved into the Settings menu; the header now shows only the gear button.',
          },
          {
            zh: '跟随系统时随操作系统或浏览器主题自动切换；各栏目与秘密页共用同一偏好。',
            en: 'System mode follows the OS or browser theme; the preference is shared across tabs and the secret page.',
          },
        ],
      },
      {
        title: {
          zh: '记住筛选与分组',
          en: 'Saved filters & groups',
        },
        items: [
          {
            zh: '区域、运营商、类型筛选在刷新后保留；搜索框文字不保留，避免上次搜索残留。',
            en: 'Zone, operator, and type filters persist after reload; the search box is not saved so old queries do not linger.',
          },
          {
            zh: '常规路线、收藏线路、每日挑战路线、季节限定等分组的展开 / 收起状态一并记住。',
            en: 'Expanded or collapsed state is remembered for Regular, Favorites, Daily challenge, Seasonal, and other list sections.',
          },
        ],
      },
      {
        title: {
          zh: '最近查看与搜索历史',
          en: 'Recently viewed & search history',
        },
        items: [
          {
            zh: '自动记录最近打开的线路（最多 10 条），「最近查看」分组位于收藏下方、常规路线上方。',
            en: 'Automatically tracks up to 10 recently opened routes; “Recently viewed” sits below Favorites and above Regular routes.',
          },
          {
            zh: '按 Enter 搜索后写入搜索历史；聚焦空搜索框时可点历史词条快速复搜，并支持一键清空。',
            en: 'Press Enter to save a query to search history; focus an empty search box to re-run past queries, with a clear-all control.',
          },
        ],
      },
      {
        title: {
          zh: '键盘快捷键',
          en: 'Keyboard shortcuts',
        },
        items: [
          {
            zh: '「/」聚焦搜索框；「↑ / ↓」在可见线路卡片间移动焦点；「Esc」关闭线路详情。',
            en: 'Press / to focus search; ↑ / ↓ move focus across visible route cards; Esc closes route detail.',
          },
          {
            zh: '使用「/」时请先点一下页面空白处，确保光标不在其他输入框内；搜索框下方亦有快捷键提示。',
            en: 'For /, click page chrome first so focus is not in another field; a shortcut hint also appears below the search box.',
          },
        ],
      },
      {
        title: {
          zh: '显示与备份',
          en: 'Display & backup',
        },
        items: [
          {
            zh: '设置中可开启「减少动态效果」或切换「标准 / 紧凑」列表密度。',
            en: 'Settings adds Reduce motion and Comfortable / Compact list density.',
          },
          {
            zh: '收藏可导出为 JSON 复制到剪贴板，或粘贴 JSON 导入（覆盖当前收藏）。',
            en: 'Favorites can be exported as JSON to the clipboard or imported by pasting JSON (replaces current favorites).',
          },
        ],
      },
      {
        title: {
          zh: '按站点反查线路',
          en: 'Stop-based route lookup',
        },
        items: [
          {
            zh: '搜索站名（至少 2 字）时显示「经过此站的线路」分组，列出途经该站的线路。',
            en: 'When a stop name is searched (2+ characters), a “Routes via this stop” section lists routes that serve matching stops.',
          },
        ],
      },
    ],
  },
  {
    id: '2026-06-13-summary',
    date: '2026-06-13',
    title: {
      zh: '2026-06-13 更新',
      en: '2026-06-13 updates',
    },
    groups: [
      {
        title: {
          zh: '浅色主题',
          en: 'Light theme',
        },
        items: [
          {
            zh: '顶部栏设置按钮左侧新增深色 / 浅色切换，偏好写入本地存储，各栏目与秘密页共用。',
            en: 'Added Dark / Light toggle to the left of Settings in the header; preference is saved locally and shared across tabs and the secret page.',
          },
          {
            zh: '浅色模式采用柔和灰蓝背景，减轻刺眼感；顶栏、卡片、滚动条与弹层阴影随主题切换。',
            en: 'Light mode uses a soft blue-grey palette to reduce glare; header, cards, scrollbars, and overlay shadows adapt to the theme.',
          },
          {
            zh: '页面加载前注入主题脚本，避免刷新时先闪深色再切换。',
            en: 'A head script applies the saved theme before paint to avoid a dark flash on reload.',
          },
        ],
      },
      {
        title: {
          zh: '自定义右键菜单',
          en: 'Custom context menu',
        },
        items: [
          {
            zh: '页面空白处右键打开站点菜单：返回、前进、刷新、返回首页、复制当前链接、在新标签页打开。',
            en: 'Right-click on page chrome opens: Back, Forward, Reload, Back to home, Copy current link, and Open in new tab.',
          },
          {
            zh: '输入框、文本域、下拉框等可编辑控件仍使用浏览器原生右键菜单。',
            en: 'Inputs, text areas, selects, and other editable fields keep the browser’s native context menu.',
          },
        ],
      },
      {
        title: {
          zh: '每日挑战',
          en: 'Daily Challenge',
        },
        items: [
          {
            zh: '「今日每日挑战」按社区公布的 2026 年 6 月日程自动切换（HKT 08:00 更换），卡片顶部显示距下次更换的秒级倒计时。',
            en: '“Today’s daily challenge” follows a community-published June 2026 schedule (resets at 08:00 HKT), with a per-second countdown to the next reset at the top of the card.',
          },
          {
            zh: '每日挑战资源来自社区整理，可能与游戏内实际不一致；请以实际游戏为准。',
            en: 'Daily challenge data comes from community sources and may not match the live in-game event — please verify in-game.',
          },
        ],
      },
      {
        title: {
          zh: '线路列表分组',
          en: 'Route list groups',
        },
        items: [
          {
            zh: '首页线路列表分为「常规路线」「每日挑战路线」「季节限定（限时）」三个可折叠分组，默认收起，点击标题展开。',
            en: 'The home route list is split into three collapsible sections — Regular, Daily challenge, and Seasonal limited-time — collapsed by default; tap a heading to expand.',
          },
          {
            zh: '各组线路依据维护清单归类；卡片展示合并后的编号（如 U47*、240），方向仍通过详情内切换查看。',
            en: 'Group membership follows the maintained route list; cards show merged numbers (e.g. U47*, 240) with direction toggles in the detail view.',
          },
          {
            zh: '筛选菜单保留区域、运营商、类型；原「线路分组」筛选项已移除，三组区块始终显示。',
            en: 'Filters keep zone, operator, and type; the old route-group filter chip was removed — all three sections stay visible.',
          },
        ],
      },
      {
        title: {
          zh: '编号前后缀搜索（Beta）',
          en: 'Route number prefix/suffix search (Beta)',
        },
        items: [
          {
            zh: '搜索栏支持 `F...`（F 开头）与 `...A`（A 结尾）等编号模式，适用于数字、字母及 #、*、% 等字符。',
            en: 'Search supports route-number patterns such as `F...` (starts with F) and `...A` (ends with A), including digits, letters, and characters like #, *, and %.',
          },
          {
            zh: '输入编号时会显示可点击建议（如输入 F 可出现 F... / ...F），一键应用前后缀筛选。',
            en: 'Typing a route token shows tappable suggestions (e.g. F → F... / ...F) to apply prefix or suffix filters in one tap.',
          },
          {
            zh: '匹配时会同时检索合并前的列表编号（如 240A、25YN），每日挑战与季节限定线路亦可搜到。',
            en: 'Matching also checks pre-merge list IDs (e.g. 240A, 25YN), so daily challenge and seasonal routes are included.',
          },
        ],
      },
    ],
  },
  {
    id: '2026-06-11-summary',
    date: '2026-06-11',
    title: {
      zh: '2026-06-11 更新',
      en: '2026-06-11 updates',
    },
    groups: [
      {
        title: {
          zh: '线路数据',
          en: 'Route data',
        },
        items: [
          {
            zh: '已补全所有常规路线。',
            en: 'All regular routes are now fully documented.',
          },
        ],
      },
      {
        title: {
          zh: '线路独立页面与 HTML 内嵌数据',
          en: 'Per-route HTML pages & embedded route data',
        },
        items: [
          {
            zh: '每条展示线路生成独立 HTML（routes/{编号}.html），点击卡片跳转至对应页面并打开详情。',
            en: 'Each displayed route now has its own HTML page (routes/{id}.html); tapping a card opens that page and the route detail view.',
          },
          {
            zh: '线路 HTML 内嵌可编辑 JSON（站序、车费、备注、报站音频等）；保存后刷新详情即可生效，重新构建时会保留已有 JSON。',
            en: 'Route HTML files embed editable JSON for stops, fare, notes, stop PA audio, and more; save and refresh the detail view to apply — rebuilds preserve your JSON edits.',
          },
          {
            zh: '详情页优先读取 routes/*.html 中的数据，未写字段仍回退至 routes.ts / Wiki 导入资料。',
            en: 'The detail view prefers data from routes/*.html; fields not set in HTML still fall back to routes.ts / Wiki-imported data.',
          },
          {
            zh: '修复线路卡片改为链接后，同一行卡片高度不一致、底边不对齐的问题。',
            en: 'Fixed uneven card heights and misaligned row bottoms after route cards became navigation links.',
          },
          {
            zh: '手工录入 25Y、76S、240A、242A、248A 等线路站序；马拉松改道环线编号统一加 A 后缀（如 240A）。',
            en: 'Added stop lists for 25Y, 76S, 240A, 242A, 248A, and more; marathon diversion loops now use an A suffix (e.g. 240A).',
          },
          {
            zh: '修复 25Y 等已录入线路因占位合并而显示「待补充」的问题，合并时优先选用资料完整的主线。',
            en: 'Fixed routes like 25Y showing “pending” when stub entries merged in; merge now prefers the most complete primary route data.',
          },
        ],
      },
      {
        title: {
          zh: '无效线路链接 404',
          en: '404 for invalid route links',
        },
        items: [
          {
            zh: '访问不存在的 ?route= 编号（如已停用的 476S）时，不再打开详情，改为显示 404 侧栏页面。',
            en: 'Invalid ?route= IDs (e.g. retired 476S) no longer open a detail view; a 404 side panel is shown instead.',
          },
          {
            zh: '404 页说明编号不存在或已停用，关闭后清除 URL 参数并返回线路列表。',
            en: 'The 404 panel explains the route ID is missing or unavailable; closing it clears the URL param and returns to the list.',
          },
          {
            zh: '搜索栏仍可通过别名找到正确线路（如搜 476S 可定位 476SA），与 URL 跳转规则分离。',
            en: 'Search aliases still work (e.g. 476S finds 476SA); URL navigation no longer resolves retired aliases.',
          },
        ],
      },
    ],
    easterEgg: true,
    easterEggTitle: {
      zh: '？？？',
      en: '???',
    },
    easterEggHex: '3d4d585a746c47646741544d6738325a76786c47496c6847646773325970783251',
  },
  {
    id: '2026-06-08-summary',
    date: '2026-06-08',
    title: {
      zh: '2026-06-08 更新',
      en: '2026-06-08 updates',
    },
    groups: [
      {
        title: {
          zh: '顶部栏收起与音乐循环',
          en: 'Header collapse & music looping',
        },
        items: [
          {
            zh: '顶部栏右上角新增收起按钮，0.5 秒动画折叠标题、导航与外链；收起后设置与收起按钮仍固定在右上角。',
            en: 'Added a collapse control at the top-right of the header; title, tabs, and external links fold with a 0.5s animation, while Settings and the toggle stay pinned top-right when collapsed.',
          },
          {
            zh: '导航标签优先单行显示，仅当宽度不足时才自动换行叠放。',
            en: 'Header tabs stay on one row when space allows; they wrap to multiple rows only when the viewport is too narrow.',
          },
          {
            zh: '音乐页：主界面、地图界面与车辆生成曲目播放结束后自动循环；结算音乐不循环，播完自动停止。',
            en: 'Music tab: main menu, map, and vehicle spawn tracks loop automatically; settlement tracks play once and stop when finished.',
          },
        ],
      },
      {
        title: {
          zh: '每日挑战 Beta 测试版',
          en: 'Daily Challenge (Beta)',
        },
        items: [
          {
            zh: '线路列表新增「今日每日挑战」卡片（样式与普通线路一致、占满整行），当前占位为 PH1 / PH 私人租用；暂无官方接口，以游戏内为准。',
            en: 'Added a full-width “Today’s daily challenge” card in the route list (same style as route cards); placeholder is PH1 / Private Hire — no official API yet, in-game prevails.',
          },
          {
            zh: '每次打开网站弹出「今天的挑战是：」提示，点击卡片可进入详情；PH 线路显示挑战说明，普通线路显示分站资料。',
            en: 'A “Today’s challenge:” prompt appears on each visit; tap the card for details — PH routes show the challenge guide, regular routes show stop data.',
          },
          {
            zh: '每日挑战参与搜索与筛选：关键词、线路分组、区域、运营商、类型等条件与其他线路相同，不匹配时自动隐藏。',
            en: 'Daily challenge follows the same search and filters as other routes; the card hides when it does not match.',
          },
          {
            zh: '详情页收录每日挑战规则说明：指定线路、运营要求、评分标准、奖励与注意事项。',
            en: 'Detail view includes the daily challenge guide: assigned route, requirements, scoring, rewards, and notes.',
          },
        ],
      },
      {
        title: {
          zh: '手机端筛选栏换行优化',
          en: 'Mobile filter bar wrap layout',
        },
        items: [
          {
            zh: '修复线路查询页筛选按钮在手机端超出屏幕的问题，超出宽度时自动换到下一行。',
            en: 'Fixed route filter chips overflowing on mobile; they now wrap to the next line when they exceed the screen width.',
          },
          {
            zh: '同步优化顶部导航标签栏，窄屏下标签自动换行显示。',
            en: 'Improved the header tab bar so tabs wrap on narrow screens.',
          },
          {
            zh: '将线路详情滑动标签页动画时长从 3 秒缩短至 0.5 秒。',
            en: 'Reduced the route detail slide tab animation duration from 3 seconds to 0.5 seconds.',
          },
          {
            zh: '线路详情新增「解锁条件」，已补充部分线路的等级或阳光碎片（Sunshards）解锁要求。',
            en: 'Route details now show unlock requirements; level and Sunshards unlock info added for many routes.',
          },
          {
            zh: '搜索栏旁新增「随机」按钮，从已录入站序的线路中随机打开详情，并自动滚动到对应卡片。',
            en: 'Added a Random button beside search to open a detail view from routes with complete stop data, scrolling the list to the selected card.',
          },
          {
            zh: '筛选标签收进搜索栏右侧的 ≡ 菜单；点击页面其他区域不会自动关闭筛选面板。',
            en: 'Moved all filter chips into a ≡ menu next to Random; the filter panel no longer closes when tapping elsewhere on the page.',
          },
          {
            zh: '移除宽屏线路列表底部的占位提示文案。',
            en: 'Removed the wide-layout placeholder hint below the route list.',
          },
        ],
      },
    ],
  },
  {
    id: '2026-05-28-summary',
    date: '2026-05-28',
    title: {
      zh: '功能整合更新（导航、77XA、历史记录）',
      en: 'Feature consolidation update (navigation, 77XA, history)',
    },
    items: [
      { zh: '新增导航栏“版本更新”栏目，并建立更新日志数据结构。', en: 'Added an Updates tab in the header and a changelog data model.' },
      { zh: '将项目从创建至今的主要功能与数据更新补录到版本更新页。', en: 'Backfilled major feature and data updates from project start to now.' },
      { zh: '新增 77XA（季节限定）线路资料，起终点为仙贝广场环线。', en: 'Added 77XA (seasonal) route data as a Senpai loop service.' },
      { zh: '按“当前站命名”规则接入 77XA 分站报站音频，共 11 段。', en: 'Integrated 77XA stop PA audio with current-stop naming, totaling 11 clips.' },
      { zh: '修复 77XA 在繁体中文下的方向文案显示。', en: 'Fixed 77XA direction text rendering in Traditional Chinese.' },
      { zh: '新增“抱怨”栏目并改为行车 / 下车抱怨广播（MP3）播放。', en: 'Added a Complaints tab and switched it to driving/alight complaint MP3 playback.' },
      { zh: '支持从 SIBS广播/抱怨 目录自动同步抱怨音频。', en: 'Added auto-sync for complaint audio from SIBS广播/抱怨 directory.' },
      { zh: '抱怨页新增筛选：全部 / 行车 / 下车 / 服务（目前无广播）。', en: 'Added complaint filters: All / Driving / Alight / Service (no broadcast yet).' },
      { zh: '导航栏新增“音乐”栏目，并接入 SIBS广播/音乐 文件播放。', en: 'Added a Music tab and wired playback from SIBS广播/音乐 files.' },
      { zh: '已知问题：抱怨页仍有少量细节问题，计划在下个版本修复。', en: 'Known issue: the Complaints page still has minor issues and will be fixed in the next release.' },
      { zh: '同步更新抱怨 8 音频，并新增结算音乐 1–3。', en: 'Synced updated complaint 8 audio and added settlement music tracks 1–3.' },
    ],
  },
  {
    id: '2026-05-27-summary',
    date: '2026-05-27',
    title: {
      zh: '数据补全与合并逻辑升级',
      en: 'Data completion and merge logic upgrade',
    },
    items: [
      { zh: '新增线路合并逻辑：将 N/S/E/W 后缀线路并入基础线路显示。', en: 'Added merge logic to fold N/S/E/W suffix routes into base route display.' },
      { zh: '合并后保留方向切换（北南/东西）并支持方向占位站序。', en: 'Kept direction toggles after merge with synthesized directional placeholders.' },
      { zh: '搜索支持方向后缀输入（如 73SN、25S）定位到对应基础线路。', en: 'Search now supports directional suffix queries like 73SN and 25S.' },
      { zh: '导入脚本支持按合并后基础线路号抓取 Wiki，并增加别名回退。', en: 'Importer now fetches by merged base route numbers with alias fallback.' },
      { zh: '重建 routesSibsTypes 数据并批量补全缺失站序，未命中条目保留占位。', en: 'Rebuilt routesSibsTypes and filled missing stop lists; unresolved routes remain as stubs.' },
      { zh: '将 476 相关数据纳入组合构建流程，减少主线缺失站序问题。', en: 'Integrated 476 composition into build flow to reduce missing mainline stop sequences.' },
    ],
  },
  {
    id: '2026-05-26-route-groups-and-filters',
    date: '2026-05-26',
    title: {
      zh: '线路分组筛选上线',
      en: 'Route group filters launched',
    },
    items: [
      { zh: '新增“常规 / 每日挑战 / 季节限定”线路分组。', en: 'Introduced route groups: regular, daily challenge, and seasonal.' },
      { zh: '将分组加入顶部筛选栏，支持一键过滤对应线路。', en: 'Added group filters to the top filter bar for one-click filtering.' },
      { zh: '修复部分分组与方向后缀线路映射错误。', en: 'Fixed several group mapping issues for directional suffix routes.' },
    ],
  },
  {
    id: '2026-05-25-data-expansion-and-sort',
    date: '2026-05-25',
    title: {
      zh: '线路数据扩充与排序优化',
      en: 'Route data expansion and sort improvements',
    },
    items: [
      { zh: '根据游戏线路清单新增大量线路占位，统一待补充展示。', en: 'Added many placeholder routes from in-game list with consistent pending display.' },
      { zh: '调整线路排序：数字开头在前，字母开头按字母顺序在后。', en: 'Adjusted sorting: numeric routes first, letter-prefixed routes ordered alphabetically after.' },
      { zh: '合并 73/73A 数据并同步修正服务类型映射。', en: 'Merged 73/73A data and synchronized service type mappings.' },
    ],
  },
  {
    id: '2026-05-24-initial-release',
    date: '2026-05-24',
    title: {
      zh: '项目初版发布',
      en: 'Initial project release',
    },
    items: [
      { zh: '建立 SIBS 线路查询页面与基础线路资料结构。', en: 'Built initial SIBS route lookup UI and base route data schema.' },
      { zh: '上线线路搜索、基础筛选与详情展示。', en: 'Launched route search, basic filters, and detail view.' },
      { zh: '提供广播页面与基础音频播放能力。', en: 'Provided broadcast page and baseline audio playback support.' },
    ],
  },
]
