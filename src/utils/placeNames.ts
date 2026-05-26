/** 常见站名：错误/英文 → 简体中文（游戏内通用译名） */
const ZH_ALIASES: Record<string, string> = {
  诺顿市镇中心: '北顿市中心',
  诺顿市中心: '北顿市中心',
  诺顿花园: '北顿花园',
  诺顿邨: '北顿邨',
  诺顿路: '北顿路',
  诺顿码头: '北顿码头',
}

const EN_TO_ZH: Record<string, string> = {
  'norton town center': '北顿市中心',
  "norton town centre": '北顿市中心',
  "container's island bus terminus": '货柜码头岛',
  "container's island": '货柜码头岛',
  'long island ferry pier': '长岛码头',
  'rainbow estate complex': '彩虹中心',
  'senpai shopping center': '仙贝广场',
  'senpai shopping centre': '仙贝广场',
  'kamaya garden': '镰塔花园',
  'kamaya sports field': '镰塔运动场',
  'zone 7 interchange (westbound)': '第七区转车站 (西行)',
  'zone 7 interchange (eastbound)': '第七区转车站 (东行)',
  'central - western interchange': '中西转车站',
  'containers terminal': '货柜码头',
  'addi city': '艾迪城',
  'dove industry zone': '白鸽工业区',
  'haisey estate': '海西邨',
  'csb depot': '际巴车厂',
  'eastmallow praya road': '东锦葵海傍路',
  'hotel symbol': '旭涛荟',
  'sunshine stadium': '阳光体育馆',
  'zone 7 interchange': '第七区转车站',
  'ft shallow valley depot': '浅水湾车厂',
  'timelapse mall': '时间廊',
  'dove park': '白鸽公园',
  'east factory': '东厂',
  'sun central street': '中日街',
  'sunshine pier': '阳光码头',
  'ambling peak': '缓步丘',
}

function normKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolvePlaceZh(zh: string, en: string): string {
  let z = zh.trim()
  if (ZH_ALIASES[z]) return ZH_ALIASES[z]
  if (/[\u4e00-\u9fff]/.test(z)) return z
  const fromEn = EN_TO_ZH[normKey(en)] ?? EN_TO_ZH[normKey(z)]
  return fromEn ?? z
}

export function resolvePlaceEn(zh: string, en: string): string {
  const e = en.trim()
  if (e && /[A-Za-z]/.test(e)) return e
  return en || zh
}

export function resolvePlaceName(zh: string, en: string): { zh: string; en: string } {
  const z = resolvePlaceZh(zh, en)
  return { zh: z, en: resolvePlaceEn(z, en) }
}

/** 起终点被误填为线路号或纯英文占位 */
export function isPlaceholderEndpoint(
  origin: { zh: string; en: string },
  destination: { zh: string; en: string },
  routeNumber: string,
): boolean {
  const id = routeNumber.replace(/\s/g, '').toUpperCase()
  const check = (t: { zh: string; en: string }) => {
    const a = t.zh.replace(/\s/g, '').toUpperCase()
    const b = t.en.replace(/\s/g, '').toUpperCase()
    if (a === id || b === id) return true
    if (!/[\u4e00-\u9fff]/.test(t.zh) && /^[A-Z0-9#*]+$/i.test(t.zh.replace(/\s/g, ''))) return true
    return false
  }
  return check(origin) || check(destination)
}
