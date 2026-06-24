import type { BilingualText, RouteStop } from '../types/route'

export interface StopNameSubRule {
  canonicalName: BilingualText
  nameSub: BilingualText
  matchEn: string[]
  matchZh?: string[]
}

/** 全站统一的站名副标题（括号内小字）；折返点站不套用 */
export const STOP_NAME_SUB_RULES: StopNameSubRule[] = [
  {
    canonicalName: { zh: '阳光殡仪馆', en: 'Sunshine Funeral' },
    matchEn: ['Sunshine Funeral'],
    matchZh: ['阳光殡仪馆', '陽光殯儀館'],
    nameSub: { zh: '阳光体育馆', en: 'Sunshine Stadium' },
  },
  {
    canonicalName: { zh: '长岛东医院', en: 'East Long Island Hospital' },
    matchEn: ['East Long Island Hospital'],
    matchZh: ['长岛东医院', '長島東醫院'],
    nameSub: { zh: '宜和剧场', en: 'Jardine Theater' },
  },
  {
    canonicalName: { zh: '彩色汇', en: 'Rainbow Center' },
    matchEn: ['Rainbow Center'],
    matchZh: ['彩色汇', '彩色匯'],
    nameSub: { zh: '虹尾角站, 智家坊', en: 'Iris Point Station, I Home' },
  },
  {
    canonicalName: { zh: '赖得里', en: 'Wright Lane' },
    matchEn: ['Wright Lane'],
    matchZh: ['赖得里', '賴得里'],
    nameSub: { zh: '赖得站', en: 'Wright Station' },
  },
  {
    canonicalName: { zh: '三哥大厦', en: 'Third Technology Building' },
    matchEn: ['Third Technology Building'],
    matchZh: ['三哥大厦', '三哥大廈'],
    nameSub: { zh: '炫光集', en: 'Neon Center' },
  },
  {
    canonicalName: { zh: '西区海底隧道转车站', en: 'Western Habour Tunnel Interchange' },
    matchEn: ['Western Habour Tunnel Interchange', 'Western Harbour Tunnel Interchange'],
    matchZh: ['西区海底隧道转车站', '西區海底隧道轉車站'],
    nameSub: { zh: '月亮湾站', en: 'Lunar Bay Station' },
  },
  {
    canonicalName: { zh: '玻璃楼', en: 'Glass Office' },
    matchEn: ['Glass Office'],
    matchZh: ['玻璃楼', '玻璃樓'],
    nameSub: { zh: '冰淇路', en: 'Pinky Road' },
  },
  {
    canonicalName: { zh: 'The ONE', en: 'The ONE' },
    matchEn: ['The ONE'],
    matchZh: ['The ONE'],
    nameSub: { zh: '警察总部, 新纪元中心', en: 'Police Headquarters, Ping Center' },
  },
  {
    canonicalName: { zh: '强生街市', en: 'Johnson Market' },
    matchEn: ['Johnson Market'],
    matchZh: ['强生街市', '強生街市'],
    nameSub: { zh: 'A05, 阳光大学南环校园', en: 'A05, Sunshine University Southern Campus' },
  },
  {
    canonicalName: { zh: '中环南总站', en: 'Southern Central Bus Terminus' },
    matchEn: ['Southern Central Bus Terminus', 'Southern Central Terminus'],
    matchZh: ['中环南总站', '中環南總站'],
    nameSub: { zh: '南环花园一期', en: 'Southern One' },
  },
  {
    canonicalName: { zh: '第七区转车站', en: 'Zone 7 Interchange' },
    matchEn: ['Zone 7 Interchange'],
    matchZh: ['第七区转车站', '第七區轉車站', '第7区转车站'],
    nameSub: { zh: '千叶站', en: 'Thousand Leaf Station' },
  },
  {
    canonicalName: { zh: '叶欣邨第一座', en: 'YiYan Estate Block 1' },
    matchEn: ['YiYan Estate Block 1'],
    matchZh: ['叶欣邨第一座', '葉欣邨第一座'],
    nameSub: { zh: '叶欣邨第二座', en: 'YiYan Estate Block 2' },
  },
  {
    canonicalName: { zh: '仙贝多层停车场', en: 'Senpai Multi-Storey Car Park' },
    matchEn: ['Senpai Multi-Storey Car Park'],
    matchZh: ['仙贝多层停车场', '仙貝多層停車場'],
    nameSub: { zh: '仙贝站', en: 'Senpai Station' },
  },
  {
    canonicalName: { zh: '东门总站', en: 'East Door Bus Terminus' },
    matchEn: ['East Door Bus Terminus'],
    matchZh: ['东门总站', '東門總站'],
    nameSub: { zh: '东门中心', en: 'East Door Complex' },
  },
  {
    canonicalName: { zh: '亚历山大教堂', en: 'Alexander Church' },
    matchEn: ['Alexander Church'],
    matchZh: ['亚历山大教堂', '亞歷山教堂'],
    nameSub: { zh: '叶角大学北门', en: 'Leafy University North Entrance' },
  },
  {
    canonicalName: { zh: '叶欣海旁道', en: 'Praya YiYan Road' },
    matchEn: ['Praya YiYan Road'],
    matchZh: ['叶欣海旁道', '葉欣海旁道', '叶欣（海旁道）'],
    nameSub: { zh: '钻石交易塔', en: 'Diamond Trading Tower' },
  },
  {
    canonicalName: { zh: '巨石路', en: 'Rocky Road' },
    matchEn: ['Rocky Road'],
    matchZh: ['巨石路'],
    nameSub: { zh: '北岛学校村', en: 'North Island School Village' },
  },
  {
    canonicalName: { zh: '虹尾角站', en: 'Iris Point Station' },
    matchEn: ['Iris Point Station'],
    matchZh: ['虹尾角站'],
    nameSub: { zh: '智家坊, 彩色汇', en: 'I Home, Rainbow Center' },
  },
  {
    canonicalName: { zh: '宜和剧场', en: 'Jardine Theater' },
    matchEn: ['Jardine Theater'],
    matchZh: ['宜和剧场', '宜和劇場'],
    nameSub: { zh: '长岛东医院', en: 'East Long Island Hospital' },
  },
]

const ZONE7_CANONICAL = STOP_NAME_SUB_RULES.find(
  (rule) => rule.canonicalName.en === 'Zone 7 Interchange',
)!

function stripParentheticalSuffix(text: string): string {
  return text.replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim()
}

function normalizeEnKey(en: string): string {
  return stripParentheticalSuffix(en).toLowerCase()
}

function normalizeZhKey(zh: string): string {
  return stripParentheticalSuffix(zh)
}

export function lookupStopNameSubRule(name: BilingualText): StopNameSubRule | undefined {
  const enKey = normalizeEnKey(name.en)
  const zhKey = normalizeZhKey(name.zh)

  for (const rule of STOP_NAME_SUB_RULES) {
    if (rule.matchEn.some((candidate) => normalizeEnKey(candidate) === enKey)) {
      return rule
    }
    if (rule.matchZh?.some((candidate) => normalizeZhKey(candidate) === zhKey)) {
      return rule
    }
  }

  return undefined
}

export function lookupStopNameSub(name: BilingualText): BilingualText | undefined {
  return lookupStopNameSubRule(name)?.nameSub
}

export function applyStopNameSubToStop<T extends {
  name: BilingualText
  nameSub?: BilingualText
  turningPoint?: boolean
}>(stop: T): T {
  if (stop.turningPoint) return stop
  const rule = lookupStopNameSubRule(stop.name)
  if (!rule) return stop
  return {
    ...stop,
    name: { ...rule.canonicalName },
    nameSub: stop.nameSub ?? rule.nameSub,
  }
}

export function isZone7InterchangeStop(name: BilingualText): boolean {
  const rule = lookupStopNameSubRule(name)
  return rule?.canonicalName.en === ZONE7_CANONICAL.canonicalName.en
}

/** 连续两个第七区转车站（不同站台后缀）合并为同一站 */
export function mergeConsecutiveZone7InterchangeStops<T extends RouteStop>(list: T[]): T[] {
  const merged: T[] = []

  for (const stop of list) {
    const prev = merged[merged.length - 1]
    if (prev && isZone7InterchangeStop(prev.name) && isZone7InterchangeStop(stop.name)) {
      merged[merged.length - 1] = applyStopNameSubToStop(prev)
      continue
    }
    merged.push(stop)
  }

  return merged
}
