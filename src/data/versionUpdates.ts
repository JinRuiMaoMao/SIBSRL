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
