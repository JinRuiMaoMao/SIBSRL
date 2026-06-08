import type { BilingualText } from '../types/route'

export interface VersionUpdateEntry {
  id: string
  date: string
  title: BilingualText
  items: BilingualText[]
}

export const versionUpdates: VersionUpdateEntry[] = [
  {
    id: '2026-06-08-mobile-filter-wrap',
    date: '2026-06-08',
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
