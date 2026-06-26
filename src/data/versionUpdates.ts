import type { BilingualText } from '../types/route'
import {
  normalizeChangelogEntry,
  type VersionUpdateEntry,
  type VersionUpdateGroup,
} from './changelogStructure'

export type { VersionUpdateEntry, VersionUpdateGroup } from './changelogStructure'
export { CHANGELOG_ADDITIONS_TITLE, CHANGELOG_FIXES_TITLE } from './changelogStructure'

export function getLatestUpdateId(): string | undefined {
  return versionUpdates[0]?.id
}

/** 弹窗 / 角标已读标记：最新条目 id + 内容指纹，同日追加内容会再次弹出。 */
export function getLatestUpdatePromptKey(): string | undefined {
  const entry = versionUpdates[0]
  if (!entry) return undefined
  return `${entry.id}#${computeUpdateContentFingerprint(entry)}`
}

/** 当前活跃更新日志日期；新改动追加到该日期的条目中。 */
export const CURRENT_CHANGELOG_DATE = '2026-06-26'

function standardUpdateTitle(date: string): BilingualText {
  return { zh: `${date} 更新`, en: `${date} updates` }
}

function groupKey(title: BilingualText): string {
  return `${title.zh}\0${title.en}`
}

function mergeGroupLists(
  a: NonNullable<VersionUpdateEntry['groups']>,
  b: NonNullable<VersionUpdateEntry['groups']>,
): NonNullable<VersionUpdateEntry['groups']> {
  const merged = a.map((group) => ({
    title: group.title,
    items: group.items ? [...group.items] : undefined,
    additions: group.additions ? [...group.additions] : undefined,
    fixes: group.fixes ? [...group.fixes] : undefined,
  }))
  for (const group of b) {
    const key = groupKey(group.title)
    const existing = merged.find((item) => groupKey(item.title) === key)
    if (existing) {
      if (group.items?.length) {
        existing.items = [...(existing.items ?? []), ...group.items]
      }
      if (group.additions?.length) {
        existing.additions = [...(existing.additions ?? []), ...group.additions]
      }
      if (group.fixes?.length) {
        existing.fixes = [...(existing.fixes ?? []), ...group.fixes]
      }
    } else {
      merged.push({
        title: group.title,
        items: group.items ? [...group.items] : undefined,
        additions: group.additions ? [...group.additions] : undefined,
        fixes: group.fixes ? [...group.fixes] : undefined,
      })
    }
  }
  return merged
}

function itemsAsGroup(items: BilingualText[]): NonNullable<VersionUpdateEntry['groups']> {
  return [{ title: { zh: '其他', en: 'Other' }, items: [...items] }]
}

/** 同一天多条记录合并为一条（保留 groups 小节，同标题合并条目）。 */
export function mergeVersionUpdatesByDate(entries: VersionUpdateEntry[]): VersionUpdateEntry[] {
  const order: string[] = []
  const byDate = new Map<string, VersionUpdateEntry[]>()

  for (const entry of entries) {
    if (!byDate.has(entry.date)) order.push(entry.date)
    const existing = byDate.get(entry.date)
    if (existing) {
      existing.push(entry)
    } else {
      byDate.set(entry.date, [entry])
    }
  }

  return order.map((date) => {
    const sameDay = byDate.get(date)!
    if (sameDay.length === 1) {
      const entry = sameDay[0]!
      return {
        ...entry,
        title: standardUpdateTitle(date),
      }
    }

    const primary = sameDay[0]!
    let groups = primary.groups
      ? [...primary.groups.map((g) => ({
          ...g,
          items: g.items ? [...g.items] : undefined,
          additions: g.additions ? [...g.additions] : undefined,
          fixes: g.fixes ? [...g.fixes] : undefined,
        }))]
      : []
    const items = primary.items ? [...primary.items] : []
    let easterEgg = primary.easterEgg
    let easterEggTitle = primary.easterEggTitle
    let easterEggHex = primary.easterEggHex

    for (const entry of sameDay.slice(1)) {
      if (entry.groups?.length) {
        groups = mergeGroupLists(groups, entry.groups)
      }
      if (entry.items?.length) {
        groups = groups.length
          ? mergeGroupLists(groups, itemsAsGroup(entry.items))
          : itemsAsGroup(entry.items)
      }
      if (entry.easterEggHex) {
        easterEgg = entry.easterEgg ?? easterEgg
        easterEggTitle = entry.easterEggTitle ?? easterEggTitle
        easterEggHex = entry.easterEggHex
      }
    }

    if (!groups.length && items.length) {
      return {
        id: primary.id,
        date,
        title: standardUpdateTitle(date),
        items,
        easterEgg,
        easterEggTitle,
        easterEggHex,
      }
    }

    return {
      id: primary.id,
      date,
      title: standardUpdateTitle(date),
      groups,
      easterEgg,
      easterEggTitle,
      easterEggHex,
    }
  })
}

function entryHasContent(entry: VersionUpdateEntry): boolean {
  if (entry.easterEggHex) return true
  if (entry.items?.length) return true
  return !!entry.groups?.some(
    (group) =>
      (group.items?.length ?? 0) > 0 ||
      (group.additions?.length ?? 0) > 0 ||
      (group.fixes?.length ?? 0) > 0,
  )
}

const versionUpdatesRaw: VersionUpdateEntry[] = [
  // 新改动追加到此条目（date = CURRENT_CHANGELOG_DATE）；无内容时不展示。
  {
    id: "2026-06-26-summary",
    date: "2026-06-26",
    title:     {
      zh: "2026-06-26 更新",
      en: "2026-06-26 updates",
    },
    groups: [
      {
        title:         {
          zh: "秘密线路",
          en: "Secret routes",
        },
        fixes:         [
                    {
            zh: "秘密页 673 与主列表 73A 分站：673 恢复海怡车厂环线原站序（经海怡岛、东厂、叶角湾及海西），主列表 73A 仍为东厂 ↺ 东门总站。",
            en: "Secret route 673 is now separate from main-list 73A: 673 restores the original Horizon Depot circular stop list (via Horizon Island, East Factory, Leafy Bay and Haisey); 73A on the index stays East Factory ↺ East Door.",
          },
        ],
      },
      {
        title:         {
          zh: "搜索与筛选",
          en: "Search & filters",
        },
        additions:         [
                    {
            zh: "搜索补全面板改为浮动层，不再挤占下方语法区；已完整输入的筛选词（如 -night）自动收起面板。",
            en: "Search completions now float over the page instead of pushing content; fully typed filter tokens (e.g. -night) auto-hide the panel.",
          },
                    {
            zh: "含 - 排除筛选时不再出现 … 前缀/后缀建议；排除词输入中仅展示筛选补全。",
            en: "Prefix/suffix … route patterns are suppressed while typing exclusions; only filter completions are offered.",
          },
                    {
            zh: "排除语法支持中文筛选名：如 -城市中轴线、-通宵、-区内；type:城市中轴线 等正向筛选同样可用中文。",
            en: "Exclusions accept localized filter names, e.g. -城市中轴线, -通宵, -区内; includes like type:城市中轴线 work too.",
          },
                    {
            zh: "搜索框新增补全面板：输入线路号或筛选语法时列出相似线路与 zone/op/type 等筛选建议，Tab 循环应用，↑↓ 高亮选项。",
            en: "Search now shows a completion panel for similar route numbers and filter tokens (zone/op/type, etc.); Tab cycles through applies, ↑↓ highlights options.",
          },
                    {
            zh: "高级搜索现支持排除区域与运营商：-zone 3 / -z 3、-FT 等（无需 op: 或冒号）；类型仍可用 -night。",
            en: "Advanced search can exclude zones and operators with -zone 3 / -z 3, -FT, etc. (no op: or colons); types still use -night.",
          },
                    {
            zh: "排除语法亦支持旧写法 -zone:3、-op:FT，与筛选菜单红色高亮同步。",
            en: "Legacy exclusion forms -zone:3 and -op:FT still work and sync to red filter chips.",
          },
                    {
            zh: "搜索框中的 zone:/op:/type: 及排除语法会同步反映到筛选菜单：正向筛选高亮强调色，排除项高亮红色。",
            en: "zone:/op:/type: tokens and exclusions in the search box now mirror the filter menu—includes use the accent highlight, exclusions show in red.",
          },
        ],
      },
      {
        title:         {
          zh: "界面与主题",
          en: "UI & themes",
        },
        fixes:         [
                    {
            zh: "开始页（index）恢复加载动画：进度条右上角显示百分比，右下角显示当前加载项（程序、图标、字体等）。",
            en: "Start page (index) boot splash restored—progress % at the top-right of the bar, current load step at the bottom-right.",
          },
                    {
            zh: "移除全站动态背景层，恢复为 html 静态主题渐变（与引入动画前一致），解决卡顿。",
            en: "Removed the site-wide animated background layer; restored static html theme gradients as before animations were added to fix lag.",
          },
                    {
            zh: "更新日志/每日挑战弹窗改为挂载到 body 并置于底栏之上，弹窗打开时隐藏底栏，避免底部按钮被挡住。",
            en: "Changelog and daily-challenge prompts now portal to body above the tab bar; the bar hides while a prompt is open so bottom buttons stay tappable.",
          },
                    {
            zh: "全站性能优化：背景改为静态主题渐变（去掉模糊光斑动画）、线路卡片取消滚动渐入、顶栏/搜索栏在触控设备关闭毛玻璃、列表蒙版检测节流。",
            en: "Site-wide perf: static theme gradient background (no blurred orb animation), no scroll-reveal on route cards, no header/search blur on touch, throttled sticky-fade checks.",
          },
                    {
            zh: "修复高级搜索语法面板展开后内容不可见（折叠动画期间高度被误算为 0）的问题。",
            en: "Fixed advanced search syntax panel appearing empty after expand—height was wrongly measured as 0 during the dock animation.",
          },
                    {
            zh: "动态背景按深/浅色分别调低亮度与动效强度（减少光斑层数与模糊），缓解深色过亮、浅色过暗及全站滚动卡顿。",
            en: "Tuned animated background separately for dark/light (fewer blobs, softer blur) to fix overly bright dark mode, dim light mode, and scroll jank.",
          },
                    {
            zh: "修复动态背景层叠顺序错误导致开始页 Logo 与「路线查询 / 更新日志」按钮被遮挡的问题。",
            en: "Fixed start page logo and Route lookup / Updates buttons hidden behind the animated background layer.",
          },
                    {
            zh: "动态背景增加多色光斑与旋转色带填充，各栏目按主题配色显示金/青/蓝/紫等更多色彩。",
            en: "Animated background now adds multi-color blobs and a rotating color mesh—each tab fills with more of its theme palette (gold, teal, blue, purple, etc.).",
          },
                    {
            zh: "修复动态背景未生效的问题，改为固定光斑层并加大漂移幅度，渐变流动应更易察觉。",
            en: "Fixed animated background not running (bad CSS selectors); replaced with fixed aurora blobs and larger motion so the gradient shift is easier to see.",
          },
                    {
            zh: "加强全站动态背景：四层主题光晕独立漂移，渐变流动更明显；「减少动态效果」仍为静态。",
            en: "Enhanced site-wide animated background—four accent glow layers drift independently for a more visible gradient flow; Reduce motion still freezes it.",
          },
                    {
            zh: "全站页面背景渐变改为缓慢动态漂移（双层光晕随主题色流动）；开启「减少动态效果」时保持静态。",
            en: "Site-wide page gradients now drift slowly with a dual-layer glow tied to each theme accent; Reduce motion keeps them static.",
          },
                    {
            zh: "线路查询等页面顶栏已移除 Roblox / 社区站 / Wiki 外链（改由开始页 index 统一提供）。",
            en: "Removed Roblox, community site, and Wiki links from the header on routes and other app pages—they now live on the start page only.",
          },
                    {
            zh: "开始页外链按钮悬浮时增加与线路卡片相同的上浮阴影质感（translateY + 主题阴影）。",
            en: "Start page outbound links now lift on hover with the same shadow treatment as route cards.",
          },
                    {
            zh: "开始页外链按钮悬浮时以主题色从左向右填充，移开后恢复仅描边样式。",
            en: "Start page outbound link buttons fill with the theme accent left-to-right on hover, reverting to outline-only when the pointer leaves.",
          },
                    {
            zh: "开始页外链在手机端改为一行 3 个、共两行网格；桌面端仍保持单行横排。",
            en: "Start page community links on mobile now use a 3×2 grid; desktop stays a single horizontal row.",
          },
                    {
            zh: "开始页外链改为一行横排，主按钮与链接字号、点击区域加大。",
            en: "Start page community links sit in a single horizontal row on desktop with larger buttons and type.",
          },
                    {
            zh: "开始页 Wiki 链接按语言切换：繁体中文指向 Roblox 中文 Wiki（Sunshine Islands 陽光群島），其余语言指向英文 Fandom Wiki；社区站链接改为 sites.google.com/view/sunshine-islands。",
            en: "Start page Wiki link now follows locale—Traditional Chinese opens the Roblox zh wiki (Sunshine Islands 陽光群島), all other languages the English Fandom wiki; community site URL updated to sites.google.com/view/sunshine-islands.",
          },
                    {
            zh: "开始页主按钮改为「路线查询」与「更新日志」；下方栏目入口替换为 YouTube、Discord、Roblox、Facebook、Website、Wiki 外链按钮。",
            en: "Start page now has Route lookup and Updates as primary buttons; the tab grid is replaced with outbound links to YouTube, Discord, Roblox, Facebook, Website, and Wiki.",
          },
                    {
            zh: "秘密线路页路线详情与主列表一致：打开时渐隐顶栏与列表仅留背景，关闭时即时恢复交互。",
            en: "Secret route detail now matches the main routes page—chrome fades out on open with only the background left, and interaction restores immediately on close.",
          },
                    {
            zh: "修复开始页（index.html）浏览器标签误显示为「线路查询 / Routes」的问题，现独立为「阳光群岛巴士线路查询 / Sunshine Islands Bus Lookup」。",
            en: "Fixed the start page (index.html) tab title showing Routes—it now reads Sunshine Islands Bus Lookup (阳光群岛巴士线路查询 in Chinese).",
          },
                    {
            zh: "顶栏巴士 Logo 单击返回开始页（index.html）；连点 10 次仍进入秘密线路页，逻辑不变。",
            en: "A single tap on the header bus logo now returns to the start page (index.html); 10 rapid taps still open secret routes as before.",
          },
                    {
            zh: "新增开始界面：GitHub Pages 入口 index.html 为欢迎页，原线路查询页移至 routes.html；旧 ?route= 等链接会自动跳转。",
            en: "Added a start page at index.html for GitHub Pages; the route lookup app moved to routes.html, with legacy ?route= links redirecting automatically.",
          },
                    {
            zh: "全站主内容区滚动时，列表卡片、区块标题与设置项等以渐入上滑动画进入视野；开启「减少动态效果」时自动跳过动画。",
            en: "Scrolling any main page now reveals list cards, section blocks, and settings fields with a fade-up animation; Reduce motion skips the effect.",
          },
                    {
            zh: "修复从线路详情返回查询页后短暂无法点击或滚动的问题：关闭动画开始时即解除遮罩拦截与滚动锁定。",
            en: "Fixed a freeze after closing route detail—the overlay no longer blocks clicks or scroll while the sheet animates out.",
          },
                    {
            zh: "面板样式透明度滑块拖动时，滑条上方实时显示当前不透明度百分比（25%～75%），并随拇指位置移动。",
            en: "The panel opacity slider now shows the current fill percentage (25%–75%) above the thumb in real time while you drag.",
          },
                    {
            zh: "进入线路详情后，查询页顶栏、底栏与线路列表以渐隐动画收起，仅保留页面背景渐变；关闭详情时渐显恢复，无填充/透明模式下观感更干净。",
            en: "Opening route detail on the index now fades out the header, tab bar, and route list—only the page background gradient remains—and fades them back in on close for a cleaner no-fill/transparent look.",
          },
                    {
            zh: "设置 → 显示新增「底栏常驻」：电脑端底部栏目切换栏可始终显示（默认仍悬停唤出）。",
            en: "Settings → Display adds Pin tab bar—keep the bottom tab bar always visible on desktop (default: hover to reveal).",
          },
                    {
            zh: "修复在 settings.html 点击「重新观看新手引导」无反应：现跳转至线路查询页开启，切换其他栏目 HTML 后继续该页引导。",
            en: "Fixed Replay guided tour from settings.html doing nothing—it now opens the routes page and continues per-tab tours as you switch pages.",
          },
                    {
            zh: "设置页外观主题切换加强选中态：显示「跟随系统/深色/浅色」文字标签，深色模式下高亮描边与底色更易辨认。",
            en: "Settings appearance theme toggle now shows System/Dark/Light labels with stronger selected borders and fill, especially in dark mode.",
          },
                    {
            zh: "无填充模式下底栏保留文字与图标、去掉毛玻璃底色；线路卡片底部区域标签与方向切换条背景同步为 0% 不透明。",
            en: "No fill mode now clears the bottom tab bar glass/fill while keeping labels and icons, and zeroes route card bottom chip backgrounds.",
          },
                    {
            zh: "修复「无填充」未生效的问题，并强化线路卡片在无填充模式下为 0% 不透明（全透明底色）；开启无填充时隐藏面板透明度滑块。",
            en: "Fixed No fill not applying correctly—route cards now use 0% opaque (fully transparent) fills in that mode, and the panel opacity slider hides while No fill is on.",
          },
                    {
            zh: "新增 settings.html 设置页：点击顶栏齿轮进入，左侧分类、右侧具体选项；原下拉设置面板已移除。",
            en: "Added settings.html: click the header gear to open a dedicated page with categories on the left and options on the right; the old dropdown panel is removed.",
          },
                    {
            zh: "面板样式滑块下方新增「无填充」开关：开启后除弹窗与页面背景外，全站面板透明无底色，仅保留边框；关闭后恢复滑块不透明度。",
            en: "Added a No fill switch below the panel style slider—when on, all panels except popups and the page background become transparent with borders kept; off restores slider opacity.",
          },
                    {
            zh: "面板样式滑块现全局生效：线路夹、音频/广播卡片、收藏分类、线路详情、底栏浮层等均随滑块调节不透明度；弹窗仍固定 ≥75% 不透明。",
            en: "Panel style slider now applies globally—route folders, audio/broadcast cards, favorite tabs, route detail sheets, tab bar float, etc. follow the slider; popups stay fixed at ≥75% opaque.",
          },
                    {
            zh: "面板样式滑块范围改为 25%（左）～ 75%（右）不透明，不再拉至 100%。",
            en: "Panel style slider now ranges from 25% opaque (left) to 75% opaque (right), no longer up to 100%.",
          },
                    {
            zh: "修复同日追加更新日志后弹窗不再出现的问题：已读标记恢复为条目 id + 内容指纹。",
            en: "Fixed the updates prompt not reappearing after same-day changelog additions—seen state again tracks id plus content fingerprint.",
          },
                    {
            zh: "设置内「面板样式」改为滑块：左滑透明、右滑实心，仅调节面板不透明度；各栏目背景渐变与卡片描边保持不变。",
            en: "Panel style in Settings is now a slider—left for transparent, right for solid—adjusting only panel opacity while page gradients and card borders stay unchanged.",
          },
                    {
            zh: "个人中心上传头像后不再撑满卡片宽度，头像固定为小圆形容器（约 3rem）显示。",
            en: "Uploaded avatars on the account page no longer stretch to full card width—they stay in a small circular frame (~3rem).",
          },
                    {
            zh: "全站弹窗（确认框、更新/每日挑战提示、设置与筛选菜单、日历、引导教程等）面板与遮罩统一为 ≥75% 不透明，透明渐变模式下不再过度透出底层页面。",
            en: "All popups (confirm dialogs, update/daily-challenge prompts, settings & filter menus, calendar, guided tour, etc.) now use ≥75% opaque panels and backdrops so the page gradient no longer bleeds through in transparent-gradient mode.",
          },
                    {
            zh: "收藏夹线路卡片同一行高度现对齐：拖拽外层参与网格拉伸，底部标签与运营商信息贴齐卡片底边。",
            en: "Favorite route cards in the same row now share equal height—the drag wrapper stretches with the grid and bottom tags/operators align to the card foot.",
          },
        ],
      },
      {
        title:         {
          zh: "每日挑战",
          en: "Daily challenge",
        },
        additions:         [
                    {
            zh: "同步 6/26 每日挑战：大雾天气 Foggy Day 74A（非竞速）。",
            en: "Synced 6/26 daily challenge: Foggy Day on 74A (non-race).",
          },
                    {
            zh: "按 Discord「~June Daily Challenge~」全文重刷 2026 年 6 月社区日程（含 6/29 待公布空白）。",
            en: "Refreshed the full June 2026 community schedule from Discord “~June Daily Challenge~” (6/29 left blank pending announcement).",
          },
                    {
            zh: "同步 6/25 每日挑战：罕见外观 U47S（非竞速）。",
            en: "Synced 6/25 daily challenge: Rare Appearance on U47S (non-race).",
          },
        ],
        fixes:         [
                    {
            zh: "修正 6/13：夜间马拉松封路 N171EM（竞速）；6/18：大桥封路 Y370A；6/23：夜间马拉松封路 N171WM（原误为 N271S）。",
            en: "Corrected 6/13 to Marathon Road Closure (N) N171EM (race), 6/18 Bridge Closure Y370A, and 6/23 Marathon Road Closure (N) N171WM (was wrongly N271S).",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-25-summary",
    date: "2026-06-25",
    title:     {
      zh: "2026-06-25 更新",
      en: "2026-06-25 updates",
    },
    groups: [
      {
        title:         {
          zh: "站序与副站名",
          en: "Stops & subtitles",
        },
        additions:         [
                    {
            zh: "补全 21 线环线 20 站站序，括号内副站名（巴士车厂、炫光集等）在详情以小字显示；第 12 站改为阿周电视转折点。",
            en: "Completed route 21 circular stop list (20 stops); parenthetical aliases (Bus Depot, Neon Center, etc.) show as subtitles; stop 12 renamed to Roblox TV turning point.",
          },
                    {
            zh: "全站「转折点」改为醒目框标记（不算站名）：站序表、起终点与途经文案中的转折点字样均统一显示。",
            en: "“Turning point” is now a vivid boxed badge (not part of the stop name) across stop tables, endpoints, and route copy.",
          },
                    {
            zh: "补全 N171 北行 61 站站序（长岛码头 → 彩虹中心），括号内副站名（阳光体育馆、月亮湾站、千叶站等）在详情以小字同行显示。",
            en: "Completed N171 northbound stop list (61 stops, Long Island Ferry Pier → Rainbow Estate Complex); parenthetical aliases (Sunshine Stadium, Lunar Bay Station, Thousand Leaf Station, etc.) show inline as subtitles.",
          },
                    {
            zh: "N171 等线路的 14 组副站名（阳光体育馆、炫光集、月亮湾站、千叶站等）已同步到全站同名站点；折返点站不受影响。",
            en: "Fourteen subtitle aliases from N171 (Sunshine Stadium, Neon Center, Lunar Bay Station, Thousand Leaf Station, etc.) now apply site-wide to matching stop names; turning-point stops are excluded.",
          },
                    {
            zh: "补全 N171 南行 63 站站序（彩虹中心 → 长岛码头）；合并第七区转车站为单站，并新增叶角大学北门、钻石交易塔、北岛学校村、虹尾角站/宜和剧场等南行副站名，已同步全站同名站点。",
            en: "Completed N171 southbound stop list (63 stops, Rainbow Estate Complex → Long Island Ferry Pier); merged Zone 7 Interchange into one stop and added southbound-only subtitles (Leafy University North Entrance, Diamond Trading Tower, North Island School Village, Iris Point/Jardine Theater pairs), synced site-wide.",
          },
                    {
            zh: "副站名规则现会统一主站名（去掉站台后缀）并合并连续重复的第七区转车站；N271 等线路的南行双站已合并为单站。",
            en: "Subtitle rules now canonicalize main stop names (drop platform suffixes) and merge consecutive duplicate Zone 7 Interchange stops; southbound double stops on N271 and similar routes are now one.",
          },
                    {
            zh: "站名副标题（括号内小字）现以更小字号与区分色显示；线路卡片起终点、站序表与转车方案均统一主副站名样式。",
            en: "Stop subtitles (parenthetical aliases) now render smaller in a distinct color; route cards, stop tables, and transfer plans share the same main/sub styling.",
          },
                    {
            zh: "副站名颜色按深浅主题分别调校（浅色为深青绿混强调色、深色为浅青混强调色），提升在渐变背景上的可读性。",
            en: "Stop subtitle colors are tuned per light/dark theme (deep teal-green with accent in light, pale cyan with accent in dark) for better readability on gradient backgrounds.",
          },
                    {
            zh: "秘密页线路加载时同样套用全站副站名规则（含站序表与卡片起终点展示）。",
            en: "Secret-page routes now use the same site-wide stop subtitle rules in stop tables and card endpoints.",
          },
        ],
        fixes:         [
                    {
            zh: "修正 N171 北行站序中叶隧道与南环文化区公园的先后次序。",
            en: "Fixed N171 northbound stop order: Leafy-Central Tunnel now comes before Southern Cultural District Park.",
          },
        ],
      },
      {
        title:         {
          zh: "界面与主题",
          en: "UI & themes",
        },
        additions:         [
                    {
            zh: "透明渐变模式下更新弹窗背景改为约 85%～92% 不透明，更新内容不再过度透出底层页面渐变。",
            en: "In transparent-gradient mode, the update prompt now uses ~85–92% opaque panels so changelog text no longer bleeds through the page gradient.",
          },
                    {
            zh: "更新弹窗与底栏「!」角标改为按最新日志条目记已读：每条更新只自动弹出一次，关闭弹窗或进入更新页后即消失，直至下一次新条目。",
            en: "The update prompt and tab “!” badge now track the latest changelog entry id—auto-show once per release, then clear after dismissing the dialog or opening the updates page until the next entry.",
          },
        ],
      },
      {
        title:         {
          zh: "更新日志",
          en: "Change log",
        },
        additions:         [
                    {
            zh: "更新日志页面改为「标题 → 小标题 → 新增 / Bug 修复」分层展示；全部历史条目已按此结构重建。",
            en: "The change log now uses a Title → section → New / Bug fixes layout, and all historical entries have been rebuilt in this structure.",
          },
                    {
            zh: "更新列表顶部显示累计新增与 Bug 修复条数；每条日期更新卡片底部显示当日合计。",
            en: "The updates list header shows all-time new and bug-fix counts; each dated entry shows that day’s totals at the bottom.",
          },
                    {
            zh: "当日新增与修复条数改显示在日期大标题右侧，格式为「本日新增 N 条 · Bug修复 N 条」。",
            en: "Per-day new and fix counts now sit to the right of the dated entry title as “Today: N new · N bug fixes”.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-24-summary",
    date: "2026-06-24",
    title:     {
      zh: "2026-06-24 更新",
      en: "2026-06-24 updates",
    },
    groups: [
      {
        title:         {
          zh: "账号与登录",
          en: "Account & sign-in",
        },
        additions:         [
                    {
            zh: "用户 API 在 Render 上启用持久磁盘，减少免费实例重启后账号数据丢失的风险。",
            en: "User API on Render now uses persistent disk, reducing account data loss risk after free-tier instance restarts.",
          },
        ],
        fixes:         [
                    {
            zh: "修复退出后重登、跨设备登录失败等问题；登录态与本地收藏读取更稳定。",
            en: "Fixed sign-in failures after logout and across devices; session handling and local favorite reads are more reliable.",
          },
                    {
            zh: "修复收藏云端同步竞态：登录后不再因状态未就绪而误用旧数据；401 时正确退回本机模式；冲突对话框层级提高，避免被遮挡。",
            en: "Fixed favorites cloud-sync races—sign-in no longer applies stale state before hydration; 401 correctly falls back to local mode; conflict dialogs sit above other overlays.",
          },
                    {
            zh: "修复 Render API 的 CORS 配置在末尾带斜杠时无法匹配 GitHub Pages 来源的问题。",
            en: "Fixed CORS when USER_API_CORS_ORIGIN had a trailing slash and did not match the GitHub Pages origin.",
          },
        ],
      },
      {
        title:         {
          zh: "验证邮件",
          en: "Verification email",
        },
        additions:         [
                    {
            zh: "优化注册/重置验证码邮件版式与发信配置，降低被判定为垃圾邮件的概率。",
            en: "Improved verification email layout and sending headers to reduce spam-folder classification.",
          },
                    {
            zh: "验证码邮件支持 15 种界面语言；发信语言跟随用户在站点内选择的语言。",
            en: "Verification emails support 15 UI languages, following the language selected in the site.",
          },
                    {
            zh: "邮件内按钮改为打开账号页并预填邮箱与验证码；从邮件跳转后注册/重置表单中的密码也会保留（新标签页或邮件 App 返回均有效）。",
            en: "Email buttons open the account page with email and code pre-filled; register/reset passwords are preserved when returning from mail in a new tab or mail app.",
          },
        ],
      },
      {
        title:         {
          zh: "新手引导",
          en: "Guided tour",
        },
        additions:         [
                    {
            zh: "新增分栏目新手引导：线路列表、线路详情、广播、音乐、NPC、更新等页面各自介绍本页控件；设置内可开关自动弹出、手动重播。",
            en: "Added per-tab guided tours for route list, route detail, broadcast, music, NPC, updates, and more; Settings can disable auto-start or replay the tour.",
          },
                    {
            zh: "提高设置面板与新手引导说明框的不透明度；浅色模式下浮层改为与白色混色，避免背后文字穿透重叠。",
            en: "Raised opacity for the settings dropdown and tour tooltips; light-theme floats blend with white so underlying text no longer shows through.",
          },
        ],
        fixes:         [
                    {
            zh: "修复浅色主题下聚光灯框错位、线路详情页误闪引导、以及引导循环导致空白页等问题。",
            en: "Fixed spotlight misalignment in light theme, unwanted tour flashes on route detail, and blank-page loops in the tour flow.",
          },
        ],
      },
      {
        title:         {
          zh: "界面与主题",
          en: "UI & themes",
        },
        additions:         [
                    {
            zh: "页面背景改为多层渐变；透明渐变模式下各栏目（线路、广播、音乐、NPC、更新、账号、秘密页）使用互不重复的独立配色。",
            en: "Page backgrounds use multi-layer gradients; transparent-gradient mode gives each tab (routes, broadcast, music, NPC, updates, account, secret) a distinct palette.",
          },
                    {
            zh: "线路卡片、收藏分类夹与内容区面板改为 25% 透明，可透出底层渐变；设置内可切换「透明渐变」与「经典实心」全站金色主题。",
            en: "Route cards, favorite folder tabs, and content panels are 25% transparent over the gradient; Settings toggles transparent gradient vs classic solid gold sitewide theme.",
          },
                    {
            zh: "浅色主题下广播（橙）、NPC（红）、更新（蓝）等栏目的渐变与强调色重新调校，避免过艳或发脏。",
            en: "Retuned light-theme gradients and accents for broadcast (orange), NPC (red), updates (blue), and related tabs to avoid harsh or muddy colors.",
          },
                    {
            zh: "广播、音乐、NPC、更新列表卡片采用与线路卡相同的加粗强调色外框与悬停高亮。",
            en: "Broadcast, music, NPC, and updates list cards now share the bold accent border and hover highlight used on route cards.",
          },
                    {
            zh: "顶栏「更新」标签在有未读日志时显示红色「!」角标；进入更新页或通过更新弹窗查看后消失。动态测量登录/设置按钮宽度，避免与「更新」标签重叠。",
            en: "The Updates tab shows a red “!” badge when the changelog is unread; it clears after opening the updates page or viewing via the update dialog. Header layout now measures control buttons to prevent overlap with tabs.",
          },
                    {
            zh: "五个栏目导航移至页面底部：电脑端鼠标移近底边时滑出 Liquid Glass 风格 Dock；手机 / iPad 为常驻底栏（图标 + 文字），与设置、日历浮层共用同一套玻璃材质。",
            en: "The five section tabs moved to a bottom dock: on desktop a Liquid Glass–style bar slides up near the bottom edge; on phones and iPads a persistent icon-and-label tab bar shares the same glass styling as settings and the calendar.",
          },
                    {
            zh: "紧凑网格下线路卡类型标签不再挤出卡片；运营商（CSB / REBC 等）固定显示在卡片右下角。",
            en: "Route type tags no longer overflow route cards in the compact grid; operator labels (CSB / REBC, etc.) stay anchored at the bottom-right of each card.",
          },
                    {
            zh: "透明渐变模式下线路详情页背景改为约 92% 不透明，站序与票价等内容不再过度透出底层渐变。",
            en: "In transparent-gradient mode, the route detail sheet now uses ~92% opaque panels so stops and fare text no longer bleed through the page gradient.",
          },
                    {
            zh: "新增「你知道吗」栏目，收录游戏里程碑与冷知识（百万访问、最高同时在线、点赞破万、地图规模等）。",
            en: "Added a “Did you know?” tab with game milestones and trivia (1M visits, peak concurrent players, 10K likes, map size, and more).",
          },
                    {
            zh: "线路卡片右上角固定显示里程；收藏星标移至卡片底部左侧，与里程分开。",
            en: "Route cards now pin length (km) to the top-right corner; the favorite star sits separately at the bottom-left.",
          },
                    {
            zh: "个人中心支持自定义显示名称与头像，保存后同步至云端并在顶栏头像处显示。",
            en: "The account page now supports a custom display name and avatar, synced to the cloud and shown in the header.",
          },
                    {
            zh: "扩大桌面端底部导航的鼠标感应区，无需贴屏幕底边即可唤出六个栏目按钮。",
            en: "Enlarged the desktop bottom tab bar hover zone so the six section buttons appear without hugging the screen edge.",
          },
                    {
            zh: "线路卡片收藏星标移至起终点右侧空白处；底部运营商名称不再被截断省略。",
            en: "Moved the favorite star to the open area beside route endpoints; operator names at the card bottom no longer truncate with ellipsis.",
          },
                    {
            zh: "线路详情新增「走向」「高度」按钮，跳转查看对应线路图（图片放在 route-maps/ 目录，可用 npm run sync:route-maps 从 SIBS 资源同步）。",
            en: "Route details now include Path and Elevation buttons that open the corresponding route map images (stored under route-maps/; sync from SIBS assets with npm run sync:route-maps).",
          },
                    {
            zh: "走向/高度图目前仅配置 77X（77XA 详情同用）与 21（21A 详情同用，可先只放走向图）；其他线路不显示按钮。",
            en: "Path/elevation maps are enabled for 77X (shared with 77XA) and 21 (shared with 21A; path-only is fine)—other routes hide the buttons.",
          },
                    {
            zh: "站间导航（起点--终点）的直达与转车方案现显示距离、时间与票价；票价为各乘车段全票相加的估算。",
            en: "Stop-to-stop navigation (start--end) now shows distance, time, and fare on direct and transfer plans; fare sums full-route fares per leg as an estimate.",
          },
                    {
            zh: "秘密页新增未授权台风特别安排 Y475（仙贝广场 ↺ 北顿市中心环线，CSB 走线；站序来自 Wiki 台风特别交通安排）。",
            en: "Secret page adds unauthorized typhoon route Y475 (Senpai Shopping Center ↺ Norton Town Center loop, CSB alignment; stops from Wiki special traffic arrangements).",
          },
        ],
        fixes:         [
                    {
            zh: "修复 iPad 主屏幕添加到书签后仍显示巴士 emoji 的问题：补充 apple-touch-icon 并为图标链接增加构建版本参数。",
            en: "Fixed iPad home-screen bookmarks still showing a bus emoji—added apple-touch-icon and cache-busting on icon URLs.",
          },
                    {
            zh: "修复 iPad 触屏上底部导航随页面滚动、以及打开设置时挡住「恢复默认设置」按钮的问题。",
            en: "Fixed the bottom tab bar drifting while scrolling on iPad touch devices, and the bar covering the Settings “Reset all settings” button.",
          },
                    {
            zh: "修复桌面端线路列表上滑时搜索栏底部蒙版未生效、与卡片文字重叠的问题。",
            en: "Fixed the desktop-only bug where the search bar bottom scrim did not activate and route text overlapped while scrolling.",
          },
                    {
            zh: "修复用户 API 的 CORS 未允许 PATCH，导致个人中心头像与昵称无法保存的问题（需重新部署 Render 用户 API）。",
            en: "Fixed user API CORS not allowing PATCH, which blocked saving profile avatars and display names (redeploy the Render user API).",
          },
                    {
            zh: "修复搜索后点进线路详情再返回时搜索词与结果消失的问题：卡片改为站内打开详情并保留 URL 搜索参数，浏览器后退可正确关闭详情。",
            en: "Fixed losing search text and results after opening route detail—cards now open in-app while preserving URL search params; browser Back closes detail and keeps the list.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-23-summary",
    date: "2026-06-23",
    title:     {
      zh: "2026-06-23 更新",
      en: "2026-06-23 updates",
    },
    groups: [
      {
        title:         {
          zh: "账号与收藏同步",
          en: "Account & cloud sync",
        },
        additions:         [
                    {
            zh: "新增邮箱账号：注册、登录、验证码邮件与重置密码；顶栏左侧头像进入个人中心（account.html），未登录时直接显示登录/注册表单。",
            en: "Added email accounts—register, sign-in, verification email, and password reset; the header avatar opens the account page (account.html), with sign-in/register when logged out.",
          },
                    {
            zh: "登录后收藏夹可云端同步：同一账号在不同设备登录可恢复收藏数据，未登录时仍仅存于本机浏览器。",
            en: "Signed-in favorites sync to the cloud—the same account restores favorites on other devices; logged-out use still keeps favorites in the local browser only.",
          },
                    {
            zh: "GitHub Pages 静态站配合 Render 用户 API 提供账号服务；验证码邮件经 SendGrid 发送，任意邮箱均可收信注册。",
            en: "GitHub Pages pairs with a Render user API for accounts; verification codes are sent via SendGrid so any email address can register.",
          },
                    {
            zh: "账号操作增加发送中/失败等状态提示；连接 Render 免费服务时自动延长等待时间，减少冷启动误报超时。",
            en: "Account actions now show sending/failure status; requests wait longer when the free Render service is waking up, reducing false timeouts.",
          },
                    {
            zh: "个人中心新增修改密码、注销账号；登录页支持 GitHub / Google 第三方登录（需在 Render 配置 OAuth 密钥）。",
            en: "Account page adds change-password and delete-account; sign-in supports GitHub / Google OAuth when keys are configured on Render.",
          },
                    {
            zh: "本机与云端都有收藏时，登录会弹出冲突处理：使用云端、使用本机或合并两边收藏夹。",
            en: "When both device and cloud have favorites, sign-in offers cloud, local, or merged resolution.",
          },
                    {
            zh: "线路详情与设置菜单新增「反馈线路资料问题」，可提交站序、车费等勘误（存入用户 API 数据库）。",
            en: "Route detail and Settings now include route data feedback for stops, fare, and related corrections (stored in the user API database).",
          },
                    {
            zh: "新增 Service Worker 离线缓存：访问过的线路 HTML 与页面资源在弱网下可继续查看。",
            en: "Added a service worker offline cache so visited route HTML and shell assets remain available on weak networks.",
          },
        ],
      },
      {
        title:         {
          zh: "界面与多语言",
          en: "UI & localization",
        },
        additions:         [
                    {
            zh: "浏览器标签页图标改为与站点 Logo 一致；切换界面语言时同步更新标签页标题与 html lang 属性。",
            en: "Browser tab favicon now matches the site logo; switching UI language also updates the document title and html lang attribute.",
          },
                    {
            zh: "个人中心、秘密页等独立栏目的标签页标题与多语言文案已补全（含 12 种扩展语言）。",
            en: "Document titles and tab labels for the account page, secret page, and other standalone tabs now include all 12 extended locales.",
          },
        ],
      },
      {
        title:         {
          zh: "每日挑战",
          en: "Daily Challenge",
        },
        additions:         [
                    {
            zh: "更新 6/23 每日挑战：夜间马拉松封路 N271S（彩虹中心 → 长岛码头），并补充 03:30、HK Special / CSB / FT 巴士要求说明。",
            en: "Updated the 6/23 Daily Challenge: Marathon Road Closure at Night on N271S (Rainbow Estate Complex → Long Island Ferry Pier), with 03:30 and HK Special / CSB / FT bus requirements noted.",
          },
        ],
      },
      {
        title:         {
          zh: "路线资料",
          en: "Route data",
        },
        additions:         [
                    {
            zh: "路线详情读取独立 HTML 时加入构建版本参数，避免浏览器继续使用旧缓存的 N171 / N271 站序。",
            en: "Route detail loading now adds the build version to standalone HTML requests, avoiding stale cached N171 / N271 stop data.",
          },
                    {
            zh: "线路卡片普通点击改为直接按链接跳转，避免在首页内等待详情加载时看起来没有反应；右键、新标签页与 iPad 长按行为保持一致。",
            en: "Route card primary clicks now follow the link directly, avoiding the page appearing stuck while detail data loads; right-click, new-tab, and iPad long-press behavior stay consistent.",
          },
                    {
            zh: "线路查询页会在浏览器空闲时预取并本地缓存独立线路 HTML；卡片直接打开已带线路参数的首页，避免未缓存线路先经过白色中转页。",
            en: "The route lookup page now prefetches and locally caches standalone route HTML while idle; cards open the route-query app page directly, avoiding the white redirect shell for uncached routes.",
          },
                    {
            zh: "独立线路中转页改为读取已保存的浅色 / 深色主题，直接访问 routes/*.html 时也不会闪出相反主题背景。",
            en: "Standalone route redirect pages now follow the saved light / dark theme, avoiding opposite-theme flashes when routes/*.html is opened directly.",
          },
                    {
            zh: "线路数量统计改用与卡片分组一致的口径，避免底层可查但当前不常驻展示的 77X / 270A 被算进分母。",
            en: "Route count totals now use the same grouped-card scope, so lookup-only daily routes such as 77X / 270A are not counted in the denominator when not shown as cards.",
          },
                    {
            zh: "多方向线路卡片初始方向统一默认到切换器左侧（北行 / 西行）；用户手动切换后仍会保留选择。",
            en: "Multi-direction route cards now default to the leftmost toggle option (northbound / westbound); manual direction changes are still remembered.",
          },
        ],
        fixes:         [
                    {
            zh: "补修 N171 / N271 独立路线页，重新使用已清理的站序资料覆盖旧 JSON，避免 Wiki 路线分隔模板显示成 subject = … 伪站名。",
            en: "Fixed the standalone N171 / N271 route pages by replacing stale embedded JSON with cleaned stop data, preventing Wiki route-break templates from appearing as subject = ... pseudo-stops.",
          },
                    {
            zh: "修正线路卡片内容层挡住底层链接的问题，现在点击站名、线路资料等卡片主体区域也会立即跳转。",
            en: "Fixed route card content layers blocking the underlying link, so tapping stop names or route info within the card body now navigates immediately.",
          },
        ],
      },
      {
        title:         {
          zh: "每日挑战日历",
          en: "Daily Challenge calendar",
        },
        additions:         [
                    {
            zh: "加入 NamuWiki 公开资料整理的 2024 年 6–8 月历史 Daily Challenge 月历；用户可在日历中切换年份和月份查看旧日期。",
            en: "Added historical June–August 2024 Daily Challenge calendars transcribed from public NamuWiki data; users can switch year/month in the calendar to view older dates.",
          },
                    {
            zh: "继续补入公开页面确认的部分历史日期：2024-09-07 R370（9 million visits 纪念竞速）与 2024-12-31 S1 观光线路上线 Daily Challenge。",
            en: "Added more publicly confirmed partial history: 2024-09-07 R370 (9 million visits race) and 2024-12-31 S1 sightseeing launch Daily Challenge.",
          },
                    {
            zh: "加入用户提供的 2026 年 5 月 Daily Challenge 完整日历，并清理 Discord emoji / 简写线路码后接入日历选择器。",
            en: "Added the user-provided full May 2026 Daily Challenge calendar, with Discord emoji and shorthand route codes cleaned up for the calendar picker.",
          },
                    {
            zh: "加入用户提供的 2026 年 4 月 Daily Challenge 完整日历；已移除 Discord emoji，并将 Marathon Shuttle (148) 标准化为 R148。",
            en: "Added the user-provided full April 2026 Daily Challenge calendar; Discord emoji were removed and Marathon Shuttle (148) was normalized to R148.",
          },
                    {
            zh: "加入用户提供的 2026 年 3 月 Daily Challenge 完整日历；已标准化 PH、25why S、Marathon (471W) 与 Marathon Shuttle (370) 等写法。",
            en: "Added the user-provided full March 2026 Daily Challenge calendar; PH, 25why S, Marathon (471W), and Marathon Shuttle (370) shorthand were normalized.",
          },
                    {
            zh: "加入用户提供的 2026 年 2 月 Daily Challenge 完整日历；已标准化 Rare Apperarance、Lazy Passenger、why370 与 Marathon (148) 等写法。",
            en: "Added the user-provided full February 2026 Daily Challenge calendar; Rare Apperarance, Lazy Passenger, why370, and Marathon (148) shorthand were normalized.",
          },
                    {
            zh: "加入用户提供的 2026 年 1 月 Daily Challenge 完整日历；已标准化 PH、Marathon / Marathon Closure、N271(N171WM) 等写法。",
            en: "Added the user-provided full January 2026 Daily Challenge calendar; PH, Marathon / Marathon Closure, and N271(N171WM) shorthand were normalized.",
          },
                    {
            zh: "加入用户提供的 2025 年 12 月 Daily Challenge 完整日历；已标准化节日备注、Free Ride、E-payment outage、Rare apperance 与 Marathon 等写法。",
            en: "Added the user-provided full December 2025 Daily Challenge calendar; holiday notes, Free Ride, E-payment outage, Rare apperance, and Marathon shorthand were normalized.",
          },
                    {
            zh: "加入用户提供的 2025 年 11 月 Daily Challenge 完整日历；已标准化 Friendly、Grumble、Private Hire 与 Marathon / why370 等写法。",
            en: "Added the user-provided full November 2025 Daily Challenge calendar; Friendly, Grumble, Private Hire, and Marathon / why370 shorthand were normalized.",
          },
                    {
            zh: "加入用户提供的 2025 年 10 月 Daily Challenge 完整日历；已标准化 Rare PH、Free、No Lights、Marathon 240 / 370AEM 等写法。",
            en: "Added the user-provided full October 2025 Daily Challenge calendar; Rare PH, Free, No Lights, and Marathon 240 / 370AEM shorthand were normalized.",
          },
                    {
            zh: "加入用户提供的 2025 年 9 月 Daily Challenge 完整日历；已标准化 Slow/Lazy Pax、No Lights、Cash only、Safety、Rare PH 与 Marathon R370/R148 等写法。",
            en: "Added the user-provided full September 2025 Daily Challenge calendar; Slow/Lazy Pax, No Lights, Cash only, Safety, Rare PH, and Marathon R370/R148 shorthand were normalized.",
          },
                    {
            zh: "加入用户提供的 2025 年 8 月 Daily Challenge 完整日历；已标准化 PayHearts、Rushour、Streetlightless、Lazi、yoU47 与多日 Race 范围。",
            en: "Added the user-provided full August 2025 Daily Challenge calendar; PayHearts, Rushour, Streetlightless, Lazi, yoU47, and multi-day race ranges were normalized.",
          },
                    {
            zh: "加入用户提供的 2025 年 7 月 Daily Challenge 完整日历；已标准化 PayHearts、R370 吐槽写法、whY370、Rushour / Rushout 与 471 to Norton 等写法。",
            en: "Added the user-provided full July 2025 Daily Challenge calendar; PayHearts, R370 joke text, whY370, Rushour / Rushout, and 471 to Norton shorthand were normalized.",
          },
                    {
            zh: "加入并补齐用户提供的 2025 年 6 月 Daily Challenge 日历；已标准化 last seen 备注、Rare PH、R148、473 Loop、N171/N146/N271 方向等写法。",
            en: "Added and completed the user-provided June 2025 Daily Challenge calendar; last-seen notes, Rare PH, R148, 473 Loop, and N171/N146/N271 direction notes were normalized.",
          },
                    {
            zh: "导入用户提供的 Discord PDF 历史日程，校正并补齐 2024 年 6 月至 2025 年 5 月 Daily Challenge 月历。",
            en: "Imported the user-provided Discord PDF history, correcting and filling Daily Challenge calendars from June 2024 through May 2025.",
          },
                    {
            zh: "每日挑战日历空白状态现在区分历史与未来：过去缺失显示「资料缺失」，今天及未来继续显示「等待游戏内更新」。",
            en: "Daily Challenge calendar empty states now distinguish history from future dates: past gaps show “Data missing”, while today/future gaps still wait for in-game updates.",
          },
                    {
            zh: "每日挑战日历新增最晚月份上限，已到现有日程最后一月时禁用「下一月」，避免跳到未来空白月份造成混乱。",
            en: "Daily Challenge calendar now caps navigation at the latest scheduled month and disables “next month” there, preventing confusing future empty months.",
          },
        ],
        fixes:         [
                    {
            zh: "重新提取并修复 N271 站序资料，移除由 Wiki 路线分隔模板误解析出来的 subject = … 乱码站名。",
            en: "Re-extracted and fixed N271 stop data, removing subject = … gibberish caused by Wiki route-break templates being parsed as stop names.",
          },
                    {
            zh: "重新提取并修复 N171 站序资料，清除同类 subject = … 乱码站名；42A 暂保持原状待后续核对。",
            en: "Re-extracted and fixed N171 stop data, clearing the same subject = … gibberish stop names; 42A is left unchanged pending later verification.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-22-summary",
    date: "2026-06-22",
    title:     {
      zh: "2026-06-22 更新",
      en: "2026-06-22 updates",
    },
    groups: [
      {
        title:         {
          zh: "线路数据",
          en: "Route data",
        },
        additions:         [
                    {
            zh: "从 Wiki Stop List 补全 476 系列站序：主线变体（476*、476#、476#*、476%）及 476P、476X、N476；上述线路不再显示「资料不全」。",
            en: "Filled 476-family stop lists from the Wiki Stop List—main-line variants (476*, 476#, 476#*, 476%), plus 476P, 476X, and N476; they no longer show the incomplete-data badge.",
          },
        ],
      },
      {
        title:         {
          zh: "环线 / 246X",
          en: "Loops / 246X",
        },
        additions:         [
                    {
            zh: "246X 等环线按行车方向分别显示里程；类型标签随视图变化（东行半直通+特班、西行特班、环线循环）。",
            en: "Circular routes like 246X show per-direction length; type tags follow the view (eastbound semi-direct + special, westbound special, loop circular).",
          },
                    {
            zh: "246X 方向控件合并为一行三选：西行 | 东行 | 环线。",
            en: "246X direction controls are one row: Westbound | Eastbound | Loop.",
          },
        ],
      },
      {
        title:         {
          zh: "线路卡片",
          en: "Route cards",
        },
        additions:         [
                    {
            zh: "常规线路卡片采用与 F469 相同的紧凑起终点竖线布局；每日挑战与最近查看保留经典文字样式。",
            en: "Regular route cards use the same compact origin/destination spine as F469; daily challenge and recent routes keep the classic text layout.",
          },
                    {
            zh: "推广样式卡片统一 F469 式金色描边；浅色模式下描边更鲜明。每日挑战与最近查看除外。",
            en: "Promoted-style cards share F469’s gold accent border—vivid in light mode; daily challenge and recent routes are excluded.",
          },
        ],
        fixes:         [
                    {
            zh: "修复列表卡片点击方向切换无反应：分组条目（如 41AN）不再锁死默认方向；方向按钮移出整卡链接层，避免浏览器吞掉点击。",
            en: "Fixed direction toggles on list cards doing nothing—grouped entries (e.g. 41AN) no longer pin the default direction, and toggle buttons sit above the card link so clicks register.",
          },
        ],
      },
      {
        title:         {
          zh: "搜索",
          en: "Search",
        },
        additions:         [
                    {
            zh: "两站查询（起点--终点）在 Enter 确认后自动滚动到结果区。",
            en: "Stop-to-stop queries (start--end) scroll to the results section after you press Enter.",
          },
                    {
            zh: "转车方案详情底部两条免责声明改为分行排列，避免重叠。",
            en: "Transfer plan footnotes are stacked so the two disclaimer lines no longer overlap.",
          },
                    {
            zh: "高级搜索语法面板增加展开/收起动画；修复滚动时与页面抢滚动、折叠后无法展开、展开后立即被滚轮收起等问题。",
            en: "Advanced search syntax panel animates open/close; fixed scroll fighting, failed re-expand after collapse, and wheel immediately re-hiding at the top.",
          },
        ],
      },
      {
        title:         {
          zh: "每日挑战",
          en: "Daily challenge",
        },
        additions:         [
                    {
            zh: "同步 6/22 每日挑战：马拉松封路 248A（Marathon Road Closure）。",
            en: "Synced 6/22 daily challenge: Marathon Road Closure on 248A.",
          },
                    {
            zh: "新增 2026 年 7 月社区日程与日历年／月切换；F469 限时倒计时改为与每日挑战相同的时:分:秒格式。",
            en: "Added July 2026 community schedule with calendar year/month navigation; F469 availability countdown matches daily-challenge HH:MM:SS format.",
          },
        ],
      },
      {
        title:         {
          zh: "其他",
          en: "Other",
        },
        additions:         [
                    {
            zh: "更新 246X 站序、日历边界与站点 Logo 路径。",
            en: "Updated 246X stops, calendar bounds, and site logo paths.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-21-summary",
    date: "2026-06-21",
    title:     {
      zh: "2026-06-21 更新",
      en: "2026-06-21 updates",
    },
    groups: [
      {
        title:         {
          zh: "线路详情",
          en: "Route detail",
        },
        additions:         [
                    {
            zh: "起终点之间显示站间距估算（基于站序与已知里程）；悬停可查看估算依据说明。",
            en: "Origin–destination stop spacing estimates appear on route detail (from stop order and known length); hover for how the estimate is derived.",
          },
                    {
            zh: "移除详情页「经停车站」摘要，避免与下方完整站序重复。",
            en: "Removed the via-stops summary on route detail—it duplicated the full stop list below.",
          },
        ],
      },
      {
        title:         {
          zh: "季节限定",
          en: "Seasonal routes",
        },
        additions:         [
                    {
            zh: "F469 自 6/21 起开放 7 日（至 6/27）；线路号旁显示限时日期，6/28 08:00（HKT）起不可用；每日挑战下方增加推广卡片。",
            en: "F469 is available for seven game days from 6/21 through 6/27—date range beside the route number, unavailable from 6/28 08:00 HKT; a promo card also appears below today’s daily challenge.",
          },
        ],
      },
      {
        title:         {
          zh: "每日挑战",
          en: "Daily challenge",
        },
        additions:         [
                    {
            zh: "同步 6/21 每日挑战：142E 竞速（Rush Hour race）。",
            en: "Synced 6/21 daily challenge: 142E Rush Hour race.",
          },
        ],
      },
      {
        title:         {
          zh: "两站查询",
          en: "Stop-to-stop search",
        },
        additions:         [
                    {
            zh: "两站结果分开展示直达与转车方案；支持出发时刻筛选、方案排序、分享链接（?from=&to=&depart=）及更稳定的换乘搜索。",
            en: "Stop-to-stop results split direct and transfer plans; added depart-time filter, plan sorting, share links (?from=&to=&depart=), and more stable transfer search.",
          },
                    {
            zh: "合并同线连续乘车段，不再出现 46→46 等假转车；修复同线终点被拆成假换乘导致漏方案。",
            en: "Merged consecutive segments on the same route—no more fake transfers like 46→46; fixed missing plans when the destination lies past a hub on one line.",
          },
                    {
            zh: "统一「阳光站」与「阳光铁路站」为同一站点（含 476/N472 站序）。",
            en: "Unified Sunshine Station and Sunshine Rail Station as the same stop (incl. 476/N472 stop lists).",
          },
                    {
            zh: "两站直达卡片按实际乘车方向显示（如 476 第七区→阳光站为东行）。",
            en: "Direct stop-pair cards use the correct travel direction (e.g. 476 Zone 7 → Sunshine Station shows eastbound).",
          },
                    {
            zh: "转车方案支持复制分享链接与自定义出发时刻选择器。",
            en: "Transfer plans support copy-share links and a custom departure-time picker.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-20-summary",
    date: "2026-06-20",
    title:     {
      zh: "2026-06-20 更新",
      en: "2026-06-20 updates",
    },
    groups: [
      {
        title:         {
          zh: "两站查询",
          en: "Stop-to-stop search",
        },
        additions:         [
                    {
            zh: "两站结果分开展示直达、转车/步行接驳；季节限定与非今日挑战线增加标签。",
            en: "Stop-to-stop results split direct vs transfer/walk sections; seasonal and off-pool routes show badges.",
          },
                    {
            zh: "新增出发时刻筛选、方案排序（少转车/最快/最短）、两站分享链接（?from=&to=&depart=）及站点解析提示。",
            en: "Added depart-time filter, plan sorting, shareable ?from=&to=&depart= links, and stop resolution notes.",
          },
                    {
            zh: "扩充步行接驳：叶角湾坟场↔叶角湾、叶角湾↔叶角湾邨、东门总站↔东门等。",
            en: "Expanded walk links—Leafy Bay Cemetery↔Leafy Bay, East Door Terminus↔East Door, and more.",
          },
                    {
            zh: "合并同线连续乘车段，不再出现 46→46、47→47 等假转车方案。",
            en: "Merged consecutive segments on the same route so plans no longer show fake transfers like 46→46 or 47→47.",
          },
                    {
            zh: "统一「阳光站」与「阳光铁路站」为同一站点（含 476/N472 站序修正）。",
            en: "Unified Sunshine Station and Sunshine Rail Station as the same stop (incl. 476/N472 stop lists).",
          },
        ],
        fixes:         [
                    {
            zh: "修复换乘搜索在复杂起终点漏方案：每条线只保留最近枢纽段，并优化 BFS frontier 截断。",
            en: "Fixed missing transfer plans on complex stop pairs—one hub hop per route and safer BFS frontier trimming.",
          },
                    {
            zh: "修复同线终点被拆成假换乘导致漏方案（如东锦葵→北岛山顶经 49A 望环台段）。",
            en: "Fixed missing plans when the destination lies past a hub on the same route (e.g. Eastmallow → North Island Hill Peak via 49A).",
          },
                    {
            zh: "两站直达卡片修正方向索引：按实际乘车方向显示（如 476 第七区→阳光站为东行而非西行）。",
            en: "Fixed direct stop-pair cards using the correct travel direction (e.g. 476 Zone 7 → Sunshine Station shows eastbound).",
          },
        ],
      },
      {
        title:         {
          zh: "季节限定",
          en: "Seasonal routes",
        },
        additions:         [
                    {
            zh: "F469 今日起开放 7 日（6/21–6/27）；线路号旁显示限时日期，6/28 08:00（HKT）起不可用；每日挑战下方同步展示推广卡片。",
            en: "F469 is available for seven game days from today (6/21–6/27)—date range beside the route number, unavailable from 6/28 08:00 HKT; a duplicate card also appears below today’s daily challenge.",
          },
                    {
            zh: "F469 补充「FT周年纪念」活动说明（关于）：车厂天台穿梭经洗车机及停放车辆。",
            en: "F469 now includes the FT Anniversary event blurb (About)—depot-roof shuttle via the bus wash and parked vehicles.",
          },
                    {
            zh: "每日挑战下方 F469 推广卡改为图示布局：季节限定（限时）、FT 周年纪念、剩余倒计时（6d 03:51:22）、站数与起终点竖线、类型标签。",
            en: "F469 promo card below daily challenge now matches the mockup—seasonal label, FT Anniversary, countdown (e.g. 6d 03:51:22), stop spine, and type tags.",
          },
                    {
            zh: "F469 限时倒计时改为与每日挑战相同的时:分:秒格式（超过 24 小时显示 Xd HH:MM:SS），每秒刷新。",
            en: "F469 availability countdown now uses daily-challenge-style HH:MM:SS (Xd HH:MM:SS when over 24h), updating every second.",
          },
        ],
      },
      {
        title:         {
          zh: "线路详情",
          en: "Route detail",
        },
        additions:         [
                    {
            zh: "移除详情页「经停车站」摘要，避免与下方完整站序重复。",
            en: "Removed the via-stops summary on route detail—it duplicated the full stop list below.",
          },
                    {
            zh: "暂移除站序表「距上站 / From prev.」列；站间距相关展示之后再做。",
            en: "Removed the stop table’s “From prev.” column for now; stop-spacing display will come later.",
          },
                    {
            zh: "走向/高度图改在本页打开，不再跳转新标签页。",
            en: "Path and elevation maps now open in the same page instead of a new tab.",
          },
                    {
            zh: "21A 已补全高度图（与 21 线路共用走向/高度入口）。",
            en: "Added the 21A elevation map (shared Path/Elevation entry with route 21).",
          },
        ],
      },
      {
        title:         {
          zh: "报站与音频",
          en: "PA & audio",
        },
        additions:         [
                    {
            zh: "全部线路终点站统一接入下车提醒音频（可从 SIBS 资源同步至 audio/routes/common/）。",
            en: "All routes now share a last-stop alighting reminder clip (syncable from SIBS assets to audio/routes/common/).",
          },
                    {
            zh: "新增站名音频池：下一停靠站名与 SIBS 资源文件夹内 MP3 文件名匹配时自动选用（npm run sync:stop-names）。",
            en: "Added a stop-name audio pool—when the next stop matches an MP3 filename in SIBS assets, that clip is used automatically (npm run sync:stop-names).",
          },
                    {
            zh: "白鸽山站名音频：21/21A 仍按经停次序区分；其他线路默认「白鸽山 2」，若第 2 站为白鸽山则用「白鸽山 1」。",
            en: "Baige Mountain stop audio: 21/21A still follow pass order; other routes default to Baige Mountain 2, switching to Baige Mountain 1 when stop #2 is Baige Mountain.",
          },
        ],
      },
      {
        title:         {
          zh: "设置",
          en: "Settings",
        },
        fixes:         [
                    {
            zh: "修复手机端右上角设置齿轮过小、难以点击的问题：放大触控区域并提高层级，避免被顶栏遮挡；设置面板内语言等按钮同步加大。",
            en: "Fixed the mobile settings gear being too small to tap—larger touch targets, higher stacking order, and bigger controls inside the settings panel.",
          },
                    {
            zh: "修复设置面板高度：随内容收缩，最高不超过齿轮下方至屏幕底部的可用空间；内容超出时在面板内滚动。",
            en: "Fixed settings panel height—it sizes to content up to the space below the gear button, scrolling inside the panel only when needed.",
          },
        ],
      },
      {
        title:         {
          zh: "顶部栏",
          en: "Header",
        },
        additions:         [
                    {
            zh: "收起顶部栏后保留站点标题与图标，避免顶栏只剩设置与展开按钮显得过空。",
            en: "When the header is collapsed, the site title and icon stay visible so the bar does not look empty beside Settings and Expand.",
          },
                    {
            zh: "顶栏折叠改为分步动画：先隐藏页签与外链，再缩小标题，最后收拢顶栏高度；展开时顺序相反。",
            en: "Header collapse now animates in stages—tabs and links hide first, then the title shrinks, then the bar height folds; expand reverses the sequence.",
          },
                    {
            zh: "缩小右上角设置与收起顶栏按钮（2.25rem），图标同步缩小，右侧留白随按钮尺寸自适应。",
            en: "Smaller settings and collapse-header buttons (2.25rem) with matching icons; right-side padding adapts to the new size.",
          },
        ],
        fixes:         [
                    {
            zh: "修复展开顶栏时上方出现空白：收起态标题条在展开时不再占用高度。",
            en: "Fixed a blank gap above the expanded header—the collapsed title bar no longer reserves height when the header is open.",
          },
                    {
            zh: "修复收起顶栏底部出现双线：仅保留外层一条主题分隔线，去掉内层重复边框。",
            en: "Fixed a double line at the bottom of the collapsed header—one theme divider on the shell only, no duplicate inner border.",
          },
        ],
      },
      {
        title:         {
          zh: "线路列表",
          en: "Route list",
        },
        additions:         [
                    {
            zh: "紧凑列表密度现同步作用于广播、音乐、NPC 与版本更新页：缩小间距与字号，广播/音乐/NPC 卡片改为多列网格，播放按钮同步缩小。",
            en: "Compact list density now applies to Broadcast, Music, NPC, and Updates—tighter spacing and type, multi-column grids for audio lists, and smaller play buttons.",
          },
                    {
            zh: "紧凑模式下广播/音乐/NPC 卡片将播放控件移至标题下方，留出分隔空隙，避免长标题与侧边按钮重叠。",
            en: "In compact mode, audio controls on Broadcast/Music/NPC cards sit below the title with a divider gap so long labels no longer collide with side buttons.",
          },
        ],
        fixes:         [
                    {
            zh: "修复紧凑模式英文下方向按钮换行后右侧留白：切换条随内容收缩，英文紧凑态改用 North/South 等短标签。",
            en: "Fixed empty space beside wrapped direction toggles in compact English—toggle bar fits content and uses short North/South labels.",
          },
        ],
      },
      {
        title:         {
          zh: "NPC",
          en: "NPC",
        },
        additions:         [
                    {
            zh: "导航栏「抱怨」栏目更名为「NPC」，音频改从 E:\\SIBS资源\\NPC 按文件夹名分类同步（npm run sync:npc）。",
            en: "Renamed the Complaints tab to NPC; audio now syncs from E:\\SIBS资源\\NPC grouped by folder name (npm run sync:npc).",
          },
                    {
            zh: "分类顺序为行车 / 下车 / 服务 / 感谢；「没上车」「目的地错误」暂未纳入。",
            en: "Categories appear as Driving / Alighting / Service / Thanks; Not aboard and Wrong destination are not included yet.",
          },
                    {
            zh: "「全部」列表序号连续编号；各分类筛选仍按分类内 1、2、3… 编号。",
            en: "The All view uses continuous numbering; each category filter keeps its own 1, 2, 3… sequence.",
          },
                    {
            zh: "条目名称去掉文件名中的「抱怨」前缀与数字，并补充中英文标题；分类标签与副标题同步去掉「抱怨」。",
            en: "Item titles strip 抱怨 prefixes and numeric suffixes from filenames, with zh/en labels; category chips and subtitles drop 抱怨 as well.",
          },
        ],
      },
      {
        title:         {
          zh: "每日挑战",
          en: "Daily challenge",
        },
        additions:         [
                    {
            zh: "同步 6/22 每日挑战：马拉松封路 248A（Marathon Road Closure）。",
            en: "Synced 6/22 daily challenge: Marathon Road Closure on 248A.",
          },
                    {
            zh: "按 Discord 社区原文更新 6 月日程：6/22、23、26、29 留空；移除此前 PH1 占位。",
            en: "Updated June schedule from Discord: 6/22, 23, 26, 29 left blank; removed PH1 placeholders.",
          },
                    {
            zh: "同步 6/20 每日挑战：街灯停电（比赛）41AS。",
            en: "Synced 6/20 daily challenge: Street light outage (race) on 41AS.",
          },
                    {
            zh: "当日挑战线路（如 41AS）自动出现在「每日挑战路线」分组，卡片显示完整编号并预选南行/北行等方向，点开详情可看站序。",
            en: "Today’s challenge route (e.g. 41AS) now appears under Daily challenge routes with the full code, preset direction, and stop list in detail.",
          },
                    {
            zh: "今日每日挑战卡片右上角新增日历按钮，可打开每日挑战日历查看当月日程（目前为 2026 年 6 月社区数据）。",
            en: "Added a calendar button on today’s daily challenge card to open the monthly schedule (currently June 2026 community data).",
          },
                    {
            zh: "紧凑模式下每日挑战卡片与日历弹窗同步缩小：日历按钮与公里数并排于顶栏，月历格子与字号更密。",
            en: "Compact mode now tightens the daily challenge card and calendar dialog—calendar button inline with km in the header, denser month grid and type.",
          },
                    {
            zh: "更新日志弹窗仅在首次访问、changelog 内容有变化、或恢复默认设置后再出现；关闭后同内容不再重复弹出。",
            en: "Updates popup shows only on first visit, when the changelog changes, or after reset—not again for the same content once dismissed.",
          },
                    {
            zh: "每日挑战日历可点击有数据的日期，直接打开该日挑战详情或对应线路。",
            en: "Daily challenge calendar days with data are clickable—opens that day’s challenge detail or matching route.",
          },
                    {
            zh: "新增 2026 年 7 月社区日程（~July Daily Challenge~）：竞速日标注 [Race]；7/21 为 Grumble Day（抱怨日）；多数日期活动名与线路待公布。",
            en: "Added July 2026 community schedule (~July Daily Challenge~)—race days marked [Race]; 7/21 is Grumble Day; most event names and routes are still TBD.",
          },
                    {
            zh: "日历支持仅标注竞速、尚无活动名的日期（显示 [Race]，不可点开详情）。",
            en: "Calendar now shows race-only days ([Race] tag) before an event name is published—they are not clickable.",
          },
                    {
            zh: "每日挑战日历新增年／月选择与上一月、下一月按钮，每次只显示一个月份（无数据月份会提示）。",
            en: "Daily challenge calendar now has year/month pickers and prev/next controls—one month at a time, with a note when no schedule exists.",
          },
                    {
            zh: "日历合并 Discord 机器人同步的历史日程，覆盖同日本地数据；有 live 数据时显示提示。",
            en: "Calendar merges history synced from the Discord bot, overriding local data for the same date; a note appears when live data is present.",
          },
        ],
        fixes:         [
                    {
            zh: "修正 6/20 每日挑战线路为 41AS（街灯停电·比赛）；Discord 原文未写括号内代号，以游戏内为准。",
            en: "Corrected 6/20 daily challenge route to 41AS (Street light outage, race); Discord omitted the code—matches in-game.",
          },
                    {
            zh: "修复同日多次追加更新日志后弹窗不再出现的问题：已读标记改为跟踪最新条目内容指纹，而非仅条目 id。",
            en: "Fixed the updates prompt not reappearing after same-day changelog additions—seen state now tracks a content fingerprint, not just entry id.",
          },
        ],
      },
      {
        title:         {
          zh: "搜索",
          en: "Search",
        },
        additions:         [
                    {
            zh: "新增两站直达搜索：from:起点 to:终点、起:/终: 或「起点 → 终点」，列出同线同方向内起点在终点前的直达线路。",
            en: "Added stop-to-stop direct route search—from:/to:, 起:/终:, or start → end lists routes where the start stop precedes the end on the same line and direction.",
          },
                    {
            zh: "两站搜索语法改为「起点--终点」；若无直达线路，自动列出最少转车次数的乘车方案，可点击各段打开线路详情。",
            en: "Stop-to-stop search now uses start--end; when no direct route exists, minimum-transfer plans appear and each leg opens route detail.",
          },
                    {
            zh: "转车方案改为卡片列表：点击方案可展开途经站序，并标注起点、转车站与终点；线路号可点开详情。",
            en: "Transfer plans are now cards—tap to expand the full stop sequence with start, transfer, and end tags; route numbers open detail.",
          },
                    {
            zh: "转车方案详情改为与线路相同的全屏滑入面板，展示完整途经站与转车位置。",
            en: "Transfer plan details now open in the same full-screen slide-in sheet as route detail, with full stops and transfer points.",
          },
                    {
            zh: "转车方案按线路组合去重：相同线路链（如 140 → 140P）只保留站数最少的一条，不再重复列出。",
            en: "Transfer plans dedupe by route chain—identical chains like 140 → 140P show once, keeping the fewest-stop variant.",
          },
                    {
            zh: "随机奖池改为：常规线路始终参与；仅当日每日挑战线路、以及已到开放期的季节限定可额外加入（见 data/seasonal-route-availability.json）。",
            en: "Random pool now uses regular routes always, plus today’s daily challenge route and seasonal routes only during their configured availability windows.",
          },
                    {
            zh: "两站直达与转车方案同步上述规则：非今日每日挑战线（如 270A）、未到开放期的季节限定不会出现在方案中。",
            en: "Stop-to-stop direct and transfer plans follow the same rules—daily routes like 270A only when featured today; seasonal routes only when unlocked.",
          },
                    {
            zh: "转车方案至少展示 6 条（按线路组合去重）：1 次转车不足 6 种时自动纳入 2 次、3 次转车等更深方案。",
            en: "Transfer plans show at least six unique route chains—if one-transfer options are fewer, two- and three-transfer plans are included.",
          },
                    {
            zh: "转车方案参考各线服务时间、班次间隔与行车时间估算，过滤运营时段不重叠或换乘来不及的方案；详情页有说明。",
            en: "Transfer plans are filtered by overlapping service hours, headway, and estimated travel time—connections that cannot be timed are dropped; see the detail note.",
          },
                    {
            zh: "导入游戏 routeData 班次时刻表（33 线 → data/route-timetables.json）；转车可行性优先按分时段首末班与间隔校验，无结构化数据的线路仍用文案 fallback。",
            en: "Imported in-game shift timetables (33 routes → data/route-timetables.json); transfer feasibility prefers banded first/last times and headways, with text fallback elsewhere.",
          },
                    {
            zh: "两站查询新增步行接驳方案（如 171 至彩虹中心再步行至彩虹广场）；步行链接见 data/walkLinks。",
            en: "Stop-to-stop search now includes walk-transfer options (e.g. route 171 to Rainbow Estate Complex then walk to Rainbow Plaza); see walkLinks data.",
          },
                    {
            zh: "转车/步行方案卡片显示估算总时间与里程（含候车、转车与步行）。",
            en: "Transfer and walk-transfer cards now show estimated total time and distance (waiting, transfers, and walking included).",
          },
        ],
        fixes:         [
                    {
            zh: "修复两站转车搜索卡死：改为仅经换乘枢纽扩展、预建站点索引并限制搜索规模，查询恢复即时响应。",
            en: "Fixed stop-to-stop transfer search freezing—search now uses transfer hubs only, a stop index, and bounded exploration for instant results.",
          },
                    {
            zh: "修复两站转车查询卡死：仅在 Enter 确认后搜索，并限制 BFS 规模与枢纽段展开数量。",
            en: "Fixed stop-to-stop transfer search freezing—search runs on Enter only, with tighter BFS bounds and hub leg caps.",
          },
        ],
      },
      {
        title:         {
          zh: "线路卡片",
          en: "Route cards",
        },
        additions:         [
                    {
            zh: "站序资料未收录完整的线路卡片显示「资料不全」标记，悬停可查看说明。",
            en: "Routes with incomplete stop data show an “Incomplete data” badge with a tooltip explaining the gap.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-19-r35",
    date: "2026-06-19",
    title:     {
      zh: "2026-06-19 更新",
      en: "2026-06-19 updates",
    },
    groups: [
      {
        title:         {
          zh: "搜索栏",
          en: "Search bar",
        },
        additions:         [
                    {
            zh: "高级搜索语法移至每日挑战上方随页滚动；置顶栏 Esc 旁保留「展开/收起语法」与快捷键提示。面板高度随视口自适应（最高 20rem），内容过多时在内部滚动。",
            en: "Advanced syntax sits above the daily challenge and scrolls with the page; the sticky bar keeps Show/Hide syntax beside Esc and shortcut hints. Panel height adapts to the viewport (max 20rem) with internal scrolling when needed.",
          },
                    {
            zh: "向下滑动：语法顶缘越过搜索框时自动隐藏，隐藏后仍可通过置顶按钮展开；页顶区域内不触发滚动隐藏，滚回顶部自动恢复展开。",
            en: "Scrolling down: syntax auto-hides when its top passes the search box, but the sticky toggle still works; the top band skips scroll-hide and syntax re-expands when you return to the top.",
          },
                    {
            zh: "页面中部点「展开语法」时，在当前位置固定显示于搜索栏下方（不跳回顶部）；再次滚动或手动收起后隐藏。",
            en: "Mid-page, Show syntax pins the panel below the search bar at your current scroll position (no jump to top); scroll again or tap Hide to dismiss.",
          },
        ],
        fixes:         [
                    {
            zh: "一并修复：收起/展开按钮无效、与线路卡片重叠或末行裁切、滚动隐藏布局抽搐与大空隙、手动收起回顶不展开、页顶展开后滚轮立刻又隐藏等问题。",
            en: "Also fixed: hide/show toggle not responding, clipped or overlapping syntax text, scroll-hide layout jitter and gaps, manual hide not restoring at the top, and wheel immediately re-hiding after expand at the top.",
          },
        ],
      },
      {
        title:         {
          zh: "线路卡片",
          en: "Route cards",
        },
        fixes:         [
                    {
            zh: "修复部分浏览器悬停线路卡片时发灰：仅在真鼠标悬停时高亮，并改用亮色背景而非深色阴影。",
            en: "Fixed some browsers greying route cards on hover—highlight only on real mouse hover with a lighter background instead of a heavy dark shadow.",
          },
        ],
      },
      {
        title:         {
          zh: "界面",
          en: "UI",
        },
        additions:         [
                    {
            zh: "线路合集内容区底部增加内边距；设置面板在各页均对齐齿轮按钮弹出。",
            en: "Route group panels now have bottom padding; settings opens aligned to the gear button on every tab.",
          },
                    {
            zh: "英文界面下经停站搜索结果改为显示英文站名，不再夹中文。",
            en: "Stop-based search summaries use English stop names when the UI is in English.",
          },
        ],
      },
      {
        title:         {
          zh: "搜索说明",
          en: "Search help",
        },
        additions:         [
                    {
            zh: "搜索框下方直接列出高级语法含义（分区、运营商、等级、类型、排除等），无需再去更新日志猜测。",
            en: "Advanced search syntax is explained under the search box (zone, operator, level, type, exclude, etc.)—no need to guess from the change log.",
          },
        ],
      },
      {
        title:         {
          zh: "音乐页",
          en: "Music page",
        },
        additions:         [
                    {
            zh: "前 6 首曲目显示名改为游戏内曲名：San Francisco Nights、Radium、Shiawase、Daily Rush、Meltdown、Night Run，并记录对应 Roblox 资产 ID。",
            en: "The first six tracks now show in-game titles—San Francisco Nights, Radium, Shiawase, Daily Rush, Meltdown, Night Run—with their Roblox asset IDs.",
          },
        ],
      },
      {
        title:         {
          zh: "每日挑战",
          en: "Daily challenge",
        },
        additions:         [
                    {
            zh: "同步社区 6 月日程：17 日马拉松封路 240A、18 日桥梁封闭 Y370、19 日马拉松接驳 R370 等。",
            en: "Synced June community schedule: 17 Jun Marathon Road Closure 240A, 18 Jun Bridge Closure Y370, 19 Jun Marathon Shuttle R370, etc.",
          },
        ],
      },
      {
        title:         {
          zh: "搜索",
          en: "Search",
        },
        additions:         [
                    {
            zh: "op: 运营商筛选不区分大小写（op:ft 与 op:FT 等效）。",
            en: "op: operator filters are now case-insensitive (op:ft works the same as op:FT).",
          },
                    {
            zh: "zone:、op:、type: 等语法同时支持半角与全角冒号（如 op：ft）。",
            en: "zone:, op:, type:, etc. accept both half-width and full-width colons (e.g. op：ft).",
          },
                    {
            zh: "新增 lv:（或 level:）按解锁等级筛选，如 lv:75 列出 Lv. 75 解锁的线路。",
            en: "New lv: (or level:) filter by unlock level—e.g. lv:75 lists routes unlocked at Lv. 75.",
          },
        ],
      },
      {
        title:         {
          zh: "语言",
          en: "Language",
        },
        additions:         [
                    {
            zh: "首次进入时读取浏览器语言并自动匹配站点语言；无法匹配时默认 English。手动选择后会记住偏好。",
            en: "First visit picks a supported language from your browser; falls back to English. Manual choice is remembered.",
          },
        ],
      },
      {
        title:         {
          zh: "更新日志",
          en: "Change log",
        },
        additions:         [
                    {
            zh: "同日期多条更新合并为单条记录，避免重复标题。",
            en: "Multiple updates on the same day are merged into one entry to avoid duplicate headings.",
          },
                    {
            zh: "更新记录右上角构建时间按访客电脑本地时区显示。",
            en: "The build timestamp at the top-right of the change log uses your local timezone.",
          },
                    {
            zh: "每次发布新更新日志后，未读过该条目的用户会再次看到更新弹窗。",
            en: "After each new change-log entry ships, users who have not read it will see the update prompt again.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-18-summary",
    date: "2026-06-18",
    title:     {
      zh: "2026-06-18 更新",
      en: "2026-06-18 updates",
    },
    groups: [
      {
        title:         {
          zh: "收藏夹",
          en: "Favorite folders",
        },
        additions:         [
                    {
            zh: "收藏支持多个自定义收藏夹：列表区分页签切换，点 + 可新建；星标按钮可选择加入哪些收藏夹。",
            en: "Favorites now support multiple custom folders—switch tabs in the list, tap + to create one, and use the star to pick folders.",
          },
                    {
            zh: "导出/导入收藏移至收藏区分页旁，不再放在设置里。",
            en: "Export/import moved next to the favorites tabs instead of Settings.",
          },
        ],
      },
      {
        title:         {
          zh: "搜索与分享",
          en: "Search & share",
        },
        additions:         [
                    {
            zh: "搜索框支持 zone:3、op:FT、type:express、-night 等语法（可与关键词组合）。",
            en: "Search supports zone:3, op:FT, type:express, -night, etc., combined with free text.",
          },
                    {
            zh: "线路详情新增「分享线路」，链接包含当前方向（?route=…&dir=…）。",
            en: "Route detail adds “Share route” with the current direction in the URL (?route=…&dir=…).",
          },
        ],
      },
      {
        title:         {
          zh: "更新日志弹窗",
          en: "Change log prompt",
        },
        additions:         [
                    {
            zh: "首次进入线路首页且未查看过更新页时，在关闭每日挑战提示后会弹出近期更新摘要；也可点「查看全部更新」进入完整更新页。",
            en: "On your first visit to the routes home (if you have not opened the change log yet), a summary appears after you dismiss the daily challenge prompt; tap “View full change log” for the full page.",
          },
        ],
      },
      {
        title:         {
          zh: "紧凑列表",
          en: "Compact list density",
        },
        additions:         [
                    {
            zh: "设置中的「紧凑」列表密度进一步缩小卡片内边距、字号与分组间距，同屏可显示更多线路。",
            en: "“Compact” list density in Settings is tighter—smaller card padding, type, and group spacing so more routes fit on screen.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-17-summary",
    date: "2026-06-17",
    title:     {
      zh: "2026-06-17 更新",
      en: "2026-06-17 updates",
    },
    groups: [
      {
        title:         {
          zh: "收藏排序与设置恢复",
          en: "Favorite ordering & settings reset",
        },
        additions:         [
                    {
            zh: "收藏线路支持拖拽排序，顺序会写入本地并在刷新后保持一致。",
            en: "Favorites now support drag-and-drop ordering; order is saved locally and persists after reload.",
          },
                    {
            zh: "设置面板新增「恢复默认设置」，可一键清空主题、语言、收藏、最近查看、筛选、分组状态、搜索历史与显示偏好。",
            en: "Settings now include “Reset all settings” to clear theme, language, favorites, recent routes, filters, group states, search history, and display preferences.",
          },
        ],
      },
      {
        title:         {
          zh: "设置面板滚动",
          en: "Settings panel scrolling",
        },
        fixes:         [
                    {
            zh: "修复设置面板在小屏和内容较多时超出屏幕的问题，面板可在视口内纵向滚动查看完整内容。",
            en: "Fixed settings panel overflow on smaller screens or larger content; the panel now scrolls vertically within the viewport.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-15-summary",
    date: "2026-06-15",
    title:     {
      zh: "2026-06-15 更新",
      en: "2026-06-15 updates",
    },
    groups: [
      {
        title:         {
          zh: "收藏线路",
          en: "Favorite routes",
        },
        additions:         [
                    {
            zh: "线路卡片与详情页可点星标收藏，偏好写入本地存储。",
            en: "Star routes on list cards or in the detail view; favorites are saved locally.",
          },
                    {
            zh: "「收藏线路」为可折叠分组，位于今日每日挑战下方、常规路线上方；收藏的线路仍保留在原有分组中显示。",
            en: "“Favorites” is a collapsible section below Today’s daily challenge and above Regular routes; favorited routes still appear in their original groups.",
          },
        ],
      },
      {
        title:         {
          zh: "设置面板",
          en: "Settings panel",
        },
        additions:         [
                    {
            zh: "外观切换（跟随系统 / 深色 / 浅色）移入设置菜单，顶栏仅保留齿轮按钮。",
            en: "Appearance (System / Dark / Light) moved into the Settings menu; the header now shows only the gear button.",
          },
                    {
            zh: "跟随系统时随操作系统或浏览器主题自动切换；各栏目与秘密页共用同一偏好。",
            en: "System mode follows the OS or browser theme; the preference is shared across tabs and the secret page.",
          },
        ],
      },
      {
        title:         {
          zh: "记住筛选与分组",
          en: "Saved filters & groups",
        },
        additions:         [
                    {
            zh: "区域、运营商、类型筛选在刷新后保留；搜索框文字不保留，避免上次搜索残留。",
            en: "Zone, operator, and type filters persist after reload; the search box is not saved so old queries do not linger.",
          },
                    {
            zh: "常规路线、收藏线路、每日挑战路线、季节限定等分组的展开 / 收起状态一并记住。",
            en: "Expanded or collapsed state is remembered for Regular, Favorites, Daily challenge, Seasonal, and other list sections.",
          },
        ],
      },
      {
        title:         {
          zh: "最近查看与搜索历史",
          en: "Recently viewed & search history",
        },
        additions:         [
                    {
            zh: "自动记录最近打开的线路（最多 10 条），「最近查看」分组位于收藏下方、常规路线上方。",
            en: "Automatically tracks up to 10 recently opened routes; “Recently viewed” sits below Favorites and above Regular routes.",
          },
                    {
            zh: "按 Enter 搜索后写入搜索历史；聚焦空搜索框时可点历史词条快速复搜，并支持一键清空。",
            en: "Press Enter to save a query to search history; focus an empty search box to re-run past queries, with a clear-all control.",
          },
        ],
      },
      {
        title:         {
          zh: "键盘快捷键",
          en: "Keyboard shortcuts",
        },
        additions:         [
                    {
            zh: "「/」聚焦搜索框；「↑ / ↓」在可见线路卡片间移动焦点；「Esc」关闭线路详情。",
            en: "Press / to focus search; ↑ / ↓ move focus across visible route cards; Esc closes route detail.",
          },
                    {
            zh: "使用「/」时请先点一下页面空白处，确保光标不在其他输入框内；搜索框下方亦有快捷键提示。",
            en: "For /, click page chrome first so focus is not in another field; a shortcut hint also appears below the search box.",
          },
        ],
      },
      {
        title:         {
          zh: "显示与备份",
          en: "Display & backup",
        },
        additions:         [
                    {
            zh: "设置中可开启「减少动态效果」或切换「标准 / 紧凑」列表密度。",
            en: "Settings adds Reduce motion and Comfortable / Compact list density.",
          },
                    {
            zh: "收藏可导出为 JSON 复制到剪贴板，或粘贴 JSON 导入（覆盖当前收藏）。",
            en: "Favorites can be exported as JSON to the clipboard or imported by pasting JSON (replaces current favorites).",
          },
        ],
      },
      {
        title:         {
          zh: "按站点反查线路",
          en: "Stop-based route lookup",
        },
        additions:         [
                    {
            zh: "搜索站名（至少 2 字）时显示「经过此站的线路」分组，列出途经该站的线路。",
            en: "When a stop name is searched (2+ characters), a “Routes via this stop” section lists routes that serve matching stops.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-13-summary",
    date: "2026-06-13",
    title:     {
      zh: "2026-06-13 更新",
      en: "2026-06-13 updates",
    },
    groups: [
      {
        title:         {
          zh: "浅色主题",
          en: "Light theme",
        },
        additions:         [
                    {
            zh: "顶部栏设置按钮左侧新增深色 / 浅色切换，偏好写入本地存储，各栏目与秘密页共用。",
            en: "Added Dark / Light toggle to the left of Settings in the header; preference is saved locally and shared across tabs and the secret page.",
          },
                    {
            zh: "浅色模式采用柔和灰蓝背景，减轻刺眼感；顶栏、卡片、滚动条与弹层阴影随主题切换。",
            en: "Light mode uses a soft blue-grey palette to reduce glare; header, cards, scrollbars, and overlay shadows adapt to the theme.",
          },
                    {
            zh: "页面加载前注入主题脚本，避免刷新时先闪深色再切换。",
            en: "A head script applies the saved theme before paint to avoid a dark flash on reload.",
          },
        ],
      },
      {
        title:         {
          zh: "自定义右键菜单",
          en: "Custom context menu",
        },
        additions:         [
                    {
            zh: "页面空白处右键打开站点菜单：返回、前进、刷新、返回首页、复制当前链接、在新标签页打开。",
            en: "Right-click on page chrome opens: Back, Forward, Reload, Back to home, Copy current link, and Open in new tab.",
          },
                    {
            zh: "输入框、文本域、下拉框等可编辑控件仍使用浏览器原生右键菜单。",
            en: "Inputs, text areas, selects, and other editable fields keep the browser’s native context menu.",
          },
        ],
      },
      {
        title:         {
          zh: "每日挑战",
          en: "Daily Challenge",
        },
        additions:         [
                    {
            zh: "「今日每日挑战」按社区公布的 2026 年 6 月日程自动切换（HKT 08:00 更换），卡片顶部显示距下次更换的秒级倒计时。",
            en: "“Today’s daily challenge” follows a community-published June 2026 schedule (resets at 08:00 HKT), with a per-second countdown to the next reset at the top of the card.",
          },
                    {
            zh: "每日挑战资源来自社区整理，可能与游戏内实际不一致；请以实际游戏为准。",
            en: "Daily challenge data comes from community sources and may not match the live in-game event — please verify in-game.",
          },
        ],
      },
      {
        title:         {
          zh: "线路列表分组",
          en: "Route list groups",
        },
        additions:         [
                    {
            zh: "首页线路列表分为「常规路线」「每日挑战路线」「季节限定（限时）」三个可折叠分组，默认收起，点击标题展开。",
            en: "The home route list is split into three collapsible sections — Regular, Daily challenge, and Seasonal limited-time — collapsed by default; tap a heading to expand.",
          },
                    {
            zh: "各组线路依据维护清单归类；卡片展示合并后的编号（如 U47*、240），方向仍通过详情内切换查看。",
            en: "Group membership follows the maintained route list; cards show merged numbers (e.g. U47*, 240) with direction toggles in the detail view.",
          },
                    {
            zh: "筛选菜单保留区域、运营商、类型；原「线路分组」筛选项已移除，三组区块始终显示。",
            en: "Filters keep zone, operator, and type; the old route-group filter chip was removed — all three sections stay visible.",
          },
        ],
      },
      {
        title:         {
          zh: "编号前后缀搜索（Beta）",
          en: "Route number prefix/suffix search (Beta)",
        },
        additions:         [
                    {
            zh: "搜索栏支持 `F...`（F 开头）与 `...A`（A 结尾）等编号模式，适用于数字、字母及 #、*、% 等字符。",
            en: "Search supports route-number patterns such as `F...` (starts with F) and `...A` (ends with A), including digits, letters, and characters like #, *, and %.",
          },
                    {
            zh: "输入编号时会显示可点击建议（如输入 F 可出现 F... / ...F），一键应用前后缀筛选。",
            en: "Typing a route token shows tappable suggestions (e.g. F → F... / ...F) to apply prefix or suffix filters in one tap.",
          },
                    {
            zh: "匹配时会同时检索合并前的列表编号（如 240A、25YN），每日挑战与季节限定线路亦可搜到。",
            en: "Matching also checks pre-merge list IDs (e.g. 240A, 25YN), so daily challenge and seasonal routes are included.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-06-11-summary",
    date: "2026-06-11",
    title:     {
      zh: "2026-06-11 更新",
      en: "2026-06-11 updates",
    },
    groups: [
      {
        title:         {
          zh: "线路数据",
          en: "Route data",
        },
        additions:         [
                    {
            zh: "已补全所有常规路线。",
            en: "All regular routes are now fully documented.",
          },
        ],
      },
      {
        title:         {
          zh: "线路独立页面与 HTML 内嵌数据",
          en: "Per-route HTML pages & embedded route data",
        },
        additions:         [
                    {
            zh: "每条展示线路生成独立 HTML（routes/{编号}.html），点击卡片跳转至对应页面并打开详情。",
            en: "Each displayed route now has its own HTML page (routes/{id}.html); tapping a card opens that page and the route detail view.",
          },
                    {
            zh: "线路 HTML 内嵌可编辑 JSON（站序、车费、备注、报站音频等）；保存后刷新详情即可生效，重新构建时会保留已有 JSON。",
            en: "Route HTML files embed editable JSON for stops, fare, notes, stop PA audio, and more; save and refresh the detail view to apply — rebuilds preserve your JSON edits.",
          },
                    {
            zh: "详情页优先读取 routes/*.html 中的数据，未写字段仍回退至 routes.ts / Wiki 导入资料。",
            en: "The detail view prefers data from routes/*.html; fields not set in HTML still fall back to routes.ts / Wiki-imported data.",
          },
                    {
            zh: "手工录入 25Y、76S、240A、242A、248A 等线路站序；马拉松改道环线编号统一加 A 后缀（如 240A）。",
            en: "Added stop lists for 25Y, 76S, 240A, 242A, 248A, and more; marathon diversion loops now use an A suffix (e.g. 240A).",
          },
        ],
        fixes:         [
                    {
            zh: "修复线路卡片改为链接后，同一行卡片高度不一致、底边不对齐的问题。",
            en: "Fixed uneven card heights and misaligned row bottoms after route cards became navigation links.",
          },
                    {
            zh: "修复 25Y 等已录入线路因占位合并而显示「待补充」的问题，合并时优先选用资料完整的主线。",
            en: "Fixed routes like 25Y showing “pending” when stub entries merged in; merge now prefers the most complete primary route data.",
          },
        ],
      },
      {
        title:         {
          zh: "无效线路链接 404",
          en: "404 for invalid route links",
        },
        additions:         [
                    {
            zh: "访问不存在的 ?route= 编号（如已停用的 476S）时，不再打开详情，改为显示 404 侧栏页面。",
            en: "Invalid ?route= IDs (e.g. retired 476S) no longer open a detail view; a 404 side panel is shown instead.",
          },
                    {
            zh: "404 页说明编号不存在或已停用，关闭后清除 URL 参数并返回线路列表。",
            en: "The 404 panel explains the route ID is missing or unavailable; closing it clears the URL param and returns to the list.",
          },
                    {
            zh: "搜索栏仍可通过别名找到正确线路（如搜 476S 可定位 476SA），与 URL 跳转规则分离。",
            en: "Search aliases still work (e.g. 476S finds 476SA); URL navigation no longer resolves retired aliases.",
          },
        ],
      },
    ],
    easterEgg: true,
    easterEggTitle:     {
      zh: "？？？",
      en: "???",
    },
    easterEggHex: "3d4d585a746c47646741544d6738325a76786c47496c6847646773325970783251",
  },
  {
    id: "2026-06-08-summary",
    date: "2026-06-08",
    title:     {
      zh: "2026-06-08 更新",
      en: "2026-06-08 updates",
    },
    groups: [
      {
        title:         {
          zh: "顶部栏收起与音乐循环",
          en: "Header collapse & music looping",
        },
        additions:         [
                    {
            zh: "顶部栏右上角新增收起按钮，0.5 秒动画折叠标题、导航与外链；收起后设置与收起按钮仍固定在右上角。",
            en: "Added a collapse control at the top-right of the header; title, tabs, and external links fold with a 0.5s animation, while Settings and the toggle stay pinned top-right when collapsed.",
          },
                    {
            zh: "导航标签优先单行显示，仅当宽度不足时才自动换行叠放。",
            en: "Header tabs stay on one row when space allows; they wrap to multiple rows only when the viewport is too narrow.",
          },
                    {
            zh: "音乐页：主界面、地图界面与车辆生成曲目播放结束后自动循环；结算音乐不循环，播完自动停止。",
            en: "Music tab: main menu, map, and vehicle spawn tracks loop automatically; settlement tracks play once and stop when finished.",
          },
        ],
      },
      {
        title:         {
          zh: "每日挑战 Beta 测试版",
          en: "Daily Challenge (Beta)",
        },
        additions:         [
                    {
            zh: "线路列表新增「今日每日挑战」卡片（样式与普通线路一致、占满整行），当前占位为 PH1 / PH 私人租用；暂无官方接口，以游戏内为准。",
            en: "Added a full-width “Today’s daily challenge” card in the route list (same style as route cards); placeholder is PH1 / Private Hire — no official API yet, in-game prevails.",
          },
                    {
            zh: "每次打开网站弹出「今天的挑战是：」提示，点击卡片可进入详情；PH 线路显示挑战说明，普通线路显示分站资料。",
            en: "A “Today’s challenge:” prompt appears on each visit; tap the card for details — PH routes show the challenge guide, regular routes show stop data.",
          },
                    {
            zh: "每日挑战参与搜索与筛选：关键词、线路分组、区域、运营商、类型等条件与其他线路相同，不匹配时自动隐藏。",
            en: "Daily challenge follows the same search and filters as other routes; the card hides when it does not match.",
          },
                    {
            zh: "详情页收录每日挑战规则说明：指定线路、运营要求、评分标准、奖励与注意事项。",
            en: "Detail view includes the daily challenge guide: assigned route, requirements, scoring, rewards, and notes.",
          },
        ],
      },
      {
        title:         {
          zh: "手机端筛选栏换行优化",
          en: "Mobile filter bar wrap layout",
        },
        additions:         [
                    {
            zh: "同步优化顶部导航标签栏，窄屏下标签自动换行显示。",
            en: "Improved the header tab bar so tabs wrap on narrow screens.",
          },
                    {
            zh: "将线路详情滑动标签页动画时长从 3 秒缩短至 0.5 秒。",
            en: "Reduced the route detail slide tab animation duration from 3 seconds to 0.5 seconds.",
          },
                    {
            zh: "线路详情新增「解锁条件」，已补充部分线路的等级或阳光碎片（Sunshards）解锁要求。",
            en: "Route details now show unlock requirements; level and Sunshards unlock info added for many routes.",
          },
                    {
            zh: "搜索栏旁新增「随机」按钮，从已录入站序的线路中随机打开详情，并自动滚动到对应卡片。",
            en: "Added a Random button beside search to open a detail view from routes with complete stop data, scrolling the list to the selected card.",
          },
                    {
            zh: "筛选标签收进搜索栏右侧的 ≡ 菜单；点击页面其他区域不会自动关闭筛选面板。",
            en: "Moved all filter chips into a ≡ menu next to Random; the filter panel no longer closes when tapping elsewhere on the page.",
          },
                    {
            zh: "移除宽屏线路列表底部的占位提示文案。",
            en: "Removed the wide-layout placeholder hint below the route list.",
          },
        ],
        fixes:         [
                    {
            zh: "修复线路查询页筛选按钮在手机端超出屏幕的问题，超出宽度时自动换到下一行。",
            en: "Fixed route filter chips overflowing on mobile; they now wrap to the next line when they exceed the screen width.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-05-28-summary",
    date: "2026-05-28",
    title:     {
      zh: "功能整合更新（导航、77XA、历史记录）",
      en: "Feature consolidation update (navigation, 77XA, history)",
    },
    groups: [
      {
        title:         {
          zh: "综合",
          en: "General",
        },
        additions:         [
                    {
            zh: "新增导航栏“版本更新”栏目，并建立更新日志数据结构。",
            en: "Added an Updates tab in the header and a changelog data model.",
          },
                    {
            zh: "将项目从创建至今的主要功能与数据更新补录到版本更新页。",
            en: "Backfilled major feature and data updates from project start to now.",
          },
                    {
            zh: "新增 77XA（季节限定）线路资料，起终点为仙贝广场环线。",
            en: "Added 77XA (seasonal) route data as a Senpai loop service.",
          },
                    {
            zh: "按“当前站命名”规则接入 77XA 分站报站音频，共 11 段。",
            en: "Integrated 77XA stop PA audio with current-stop naming, totaling 11 clips.",
          },
                    {
            zh: "新增“抱怨”栏目并改为行车 / 下车抱怨广播（MP3）播放。",
            en: "Added a Complaints tab and switched it to driving/alight complaint MP3 playback.",
          },
                    {
            zh: "支持从 SIBS广播/抱怨 目录自动同步抱怨音频。",
            en: "Added auto-sync for complaint audio from SIBS广播/抱怨 directory.",
          },
                    {
            zh: "抱怨页新增筛选：全部 / 行车 / 下车 / 服务（目前无广播）。",
            en: "Added complaint filters: All / Driving / Alight / Service (no broadcast yet).",
          },
                    {
            zh: "导航栏新增“音乐”栏目，并接入 SIBS广播/音乐 文件播放。",
            en: "Added a Music tab and wired playback from SIBS广播/音乐 files.",
          },
                    {
            zh: "已知问题：抱怨页仍有少量细节问题，计划在下个版本修复。",
            en: "Known issue: the Complaints page still has minor issues and will be fixed in the next release.",
          },
                    {
            zh: "同步更新抱怨 8 音频，并新增结算音乐 1–3。",
            en: "Synced updated complaint 8 audio and added settlement music tracks 1–3.",
          },
        ],
        fixes:         [
                    {
            zh: "修复 77XA 在繁体中文下的方向文案显示。",
            en: "Fixed 77XA direction text rendering in Traditional Chinese.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-05-27-summary",
    date: "2026-05-27",
    title:     {
      zh: "数据补全与合并逻辑升级",
      en: "Data completion and merge logic upgrade",
    },
    groups: [
      {
        title:         {
          zh: "综合",
          en: "General",
        },
        additions:         [
                    {
            zh: "新增线路合并逻辑：将 N/S/E/W 后缀线路并入基础线路显示。",
            en: "Added merge logic to fold N/S/E/W suffix routes into base route display.",
          },
                    {
            zh: "合并后保留方向切换（北南/东西）并支持方向占位站序。",
            en: "Kept direction toggles after merge with synthesized directional placeholders.",
          },
                    {
            zh: "搜索支持方向后缀输入（如 73SN、25S）定位到对应基础线路。",
            en: "Search now supports directional suffix queries like 73SN and 25S.",
          },
                    {
            zh: "导入脚本支持按合并后基础线路号抓取 Wiki，并增加别名回退。",
            en: "Importer now fetches by merged base route numbers with alias fallback.",
          },
                    {
            zh: "重建 routesSibsTypes 数据并批量补全缺失站序，未命中条目保留占位。",
            en: "Rebuilt routesSibsTypes and filled missing stop lists; unresolved routes remain as stubs.",
          },
                    {
            zh: "将 476 相关数据纳入组合构建流程，减少主线缺失站序问题。",
            en: "Integrated 476 composition into build flow to reduce missing mainline stop sequences.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-05-26-route-groups-and-filters",
    date: "2026-05-26",
    title:     {
      zh: "线路分组筛选上线",
      en: "Route group filters launched",
    },
    groups: [
      {
        title:         {
          zh: "综合",
          en: "General",
        },
        additions:         [
                    {
            zh: "新增“常规 / 每日挑战 / 季节限定”线路分组。",
            en: "Introduced route groups: regular, daily challenge, and seasonal.",
          },
                    {
            zh: "将分组加入顶部筛选栏，支持一键过滤对应线路。",
            en: "Added group filters to the top filter bar for one-click filtering.",
          },
        ],
        fixes:         [
                    {
            zh: "修复部分分组与方向后缀线路映射错误。",
            en: "Fixed several group mapping issues for directional suffix routes.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-05-25-data-expansion-and-sort",
    date: "2026-05-25",
    title:     {
      zh: "线路数据扩充与排序优化",
      en: "Route data expansion and sort improvements",
    },
    groups: [
      {
        title:         {
          zh: "综合",
          en: "General",
        },
        additions:         [
                    {
            zh: "根据游戏线路清单新增大量线路占位，统一待补充展示。",
            en: "Added many placeholder routes from in-game list with consistent pending display.",
          },
                    {
            zh: "调整线路排序：数字开头在前，字母开头按字母顺序在后。",
            en: "Adjusted sorting: numeric routes first, letter-prefixed routes ordered alphabetically after.",
          },
                    {
            zh: "合并 73/73A 数据并同步修正服务类型映射。",
            en: "Merged 73/73A data and synchronized service type mappings.",
          },
        ],
      },
    ],
  },
  {
    id: "2026-05-24-initial-release",
    date: "2026-05-24",
    title:     {
      zh: "项目初版发布",
      en: "Initial project release",
    },
    groups: [
      {
        title:         {
          zh: "综合",
          en: "General",
        },
        additions:         [
                    {
            zh: "建立 SIBS 线路查询页面与基础线路资料结构。",
            en: "Built initial SIBS route lookup UI and base route data schema.",
          },
                    {
            zh: "上线线路搜索、基础筛选与详情展示。",
            en: "Launched route search, basic filters, and detail view.",
          },
                    {
            zh: "提供广播页面与基础音频播放能力。",
            en: "Provided broadcast page and baseline audio playback support.",
          },
        ],
      },
    ],
  },
]
export const versionUpdates = mergeVersionUpdatesByDate(versionUpdatesRaw)
  .filter(entryHasContent)
  .map(normalizeChangelogEntry)

function computeUpdateContentFingerprint(entry: VersionUpdateEntry): string {
  const parts: string[] = [entry.title.zh, entry.title.en]
  for (const group of entry.groups ?? []) {
    parts.push(group.title.zh, group.title.en)
    for (const item of group.additions ?? []) parts.push(item.zh, item.en)
    for (const item of group.fixes ?? []) parts.push(item.zh, item.en)
    for (const item of group.items ?? []) parts.push(item.zh, item.en)
  }
  for (const item of entry.items ?? []) parts.push(item.zh, item.en)

  let hash = 0
  const text = parts.join('\0')
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

export { versionUpdatesRaw }
