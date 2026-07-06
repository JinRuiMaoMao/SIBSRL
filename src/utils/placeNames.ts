/** 常见站名：错误/英文 → 简体中文（游戏内通用译名） */
import { GENERATED_ZH_STOP_ALIASES } from '../data/stopAliases.generated'

const ZH_ALIASES: Record<string, string> = {
  安灵台灵灰安置所: '安灵台',
  灵灰安置所: '安灵台',
  第7区转车站: '第七区转车站',
  城际巴士车厂: '际巴车厂',
  叶欣海旁路: '叶欣海旁道',
  东锦葵海旁路: '东锦葵海傍路',
  叶欣𠇹: '叶欣径',
  亚历山花园: '亚历山大花园',
  亚历山教堂: '亚历山大教堂',
  东锦葵邨阳葵楼: '东锦葵邨 - 阳葵屋',
  '东锦葵邨－阳葵屋': '东锦葵邨 - 阳葵屋',
  诺顿市镇中心: '北顿市中心',
  诺顿市中心: '北顿市中心',
  诺顿花园: '北顿花园',
  诺顿邨: '北顿邨',
  诺顿路: '北顿路',
  诺顿码头: '北顿码头',
  阳光铁路站: '阳光站',
  陽光鐵路站: '阳光站',
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
  'eddie city': '伊迪城',
  'dove industry zone': '白鸽工业区',
  'haisey estate': '海西邨',
  'csb depot': '际巴车厂',
  'eastmallow praya road': '东锦葵海傍路',
  'hotel symbol': '旭涛荟',
  'sunshine stadium': '阳光体育馆',
  'zone 7 interchange': '第七区转车站',
  'western harbour tunnel interchange': '西区海底隧道转车站',
  'north island estate': '北岛花园',
  'sunshine university': '阳光大学',
  'northern interchange (southbound)': '北环转车站 (南行)',
  'praya yiyan road': '叶欣海旁道',
  'sun central street': '中日街',
  'ft shallow valley depot': '浅水湾车厂',
  'timelapse mall': '时间廊',
  'dove park': '白鸽公园',
  'east factory': '东厂',
  'sunshine pier': '阳光码头',
  'ambling peak columbarium': '安灵台',
  'ambling peak': '安灵台',
  'long island east': '长岛东',
  'dove island': '白鸽岛',
  'hospital island': '医院岛',
  'international tower': '国际大厦',
  'east door': '东门',
  'rainbow estate': '彩虹邨',
  'rainbow': '彩虹',
  'normal gap': '普通道',
  'leafy bay estate': '叶角湾邨',
  'leafy bay cemetery': '叶角湾坟场',
  'leafy bay': '叶角湾',
  'leafy university': '叶角大学',
  'leafy hospital': '叶角医院',
  'sunshine station': '阳光站',
  'sunshine rail station': '阳光站',
  'sunshine railway station': '阳光站',
  southern: '南环',
  central: '中环',
  northern: '北环',
  'northern interchange': '北环转车站',
  alexander: '亚历山大',
  'north leafy': '北叶角',
  wright: '赖特',
  'dove hill': '白鸽山',
  'dove estate': '白鸽邨',
  yiyan: '叶欣',
  'yi yan': '叶欣',
  eastmallow: '东锦葵',
  kamaya: '镰塔',
  senpai: '仙贝',
  haisey: '海西',
  'shopping corridor': '购物廊',
  'bird bridge': '雀鸟桥',
  norton: '北顿',
  'leafy university (leafy university street)': '叶角大学（叶角大学街）',
  'sunshine university southern campus': '阳光大学南校园',
  'and north island estate': '及北岛花园',
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
  if (GENERATED_ZH_STOP_ALIASES[z]) return GENERATED_ZH_STOP_ALIASES[z]
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
