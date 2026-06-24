import type { BilingualText } from '../types/route'

export interface StopNameSubRule {
  nameSub: BilingualText
  matchEn: string[]
  matchZh?: string[]
}

/** 全站统一的站名副标题（括号内小字）；折返点站不套用 */
export const STOP_NAME_SUB_RULES: StopNameSubRule[] = [
  {
    matchEn: ['Sunshine Funeral'],
    matchZh: ['阳光殡仪馆', '陽光殯儀館'],
    nameSub: { zh: '阳光体育馆', en: 'Sunshine Stadium' },
  },
  {
    matchEn: ['East Long Island Hospital'],
    matchZh: ['长岛东医院', '長島東醫院'],
    nameSub: { zh: '宜和剧场', en: 'Jardine Theater' },
  },
  {
    matchEn: ['Rainbow Center'],
    matchZh: ['彩色汇', '彩色匯'],
    nameSub: { zh: '虹尾角站, 智家坊', en: 'Iris Point Station, I Home' },
  },
  {
    matchEn: ['Wright Lane'],
    matchZh: ['赖得里', '賴得里'],
    nameSub: { zh: '赖得站', en: 'Wright Station' },
  },
  {
    matchEn: ['Third Technology Building'],
    matchZh: ['三哥大厦', '三哥大廈'],
    nameSub: { zh: '炫光集', en: 'Neon Center' },
  },
  {
    matchEn: ['Western Habour Tunnel Interchange', 'Western Harbour Tunnel Interchange'],
    matchZh: ['西区海底隧道转车站', '西區海底隧道轉車站'],
    nameSub: { zh: '月亮湾站', en: 'Lunar Bay Station' },
  },
  {
    matchEn: ['Glass Office'],
    matchZh: ['玻璃楼', '玻璃樓'],
    nameSub: { zh: '冰淇路', en: 'Pinky Road' },
  },
  {
    matchEn: ['The ONE'],
    matchZh: ['The ONE'],
    nameSub: { zh: '警察总部, 新纪元中心', en: 'Police Headquarters, Ping Center' },
  },
  {
    matchEn: ['Johnson Market'],
    matchZh: ['强生街市', '強生街市'],
    nameSub: { zh: 'A05, 阳光大学南环校园', en: 'A05, Sunshine University Southern Campus' },
  },
  {
    matchEn: ['Southern Central Bus Terminus', 'Southern Central Terminus'],
    matchZh: ['中环南总站', '中環南總站'],
    nameSub: { zh: '南环花园一期', en: 'Southern One' },
  },
  {
    matchEn: ['Zone 7 Interchange'],
    matchZh: ['第七区转车站', '第七區轉車站'],
    nameSub: { zh: '千叶站', en: 'Thousand Leaf Station' },
  },
  {
    matchEn: ['YiYan Estate Block 1'],
    matchZh: ['叶欣邨第一座', '葉欣邨第一座'],
    nameSub: { zh: '叶欣邨第二座', en: 'YiYan Estate Block 2' },
  },
  {
    matchEn: ['Senpai Multi-Storey Car Park'],
    matchZh: ['仙贝多层停车场', '仙貝多層停車場'],
    nameSub: { zh: '仙贝站', en: 'Senpai Station' },
  },
  {
    matchEn: ['East Door Bus Terminus'],
    matchZh: ['东门总站', '東門總站'],
    nameSub: { zh: '东门中心', en: 'East Door Complex' },
  },
  {
    matchEn: ['Alexander Church'],
    matchZh: ['亚历山大教堂', '亞歷山教堂'],
    nameSub: { zh: '叶角大学北门', en: 'Leafy University North Entrance' },
  },
  {
    matchEn: ['Praya YiYan Road'],
    matchZh: ['叶欣海旁道', '葉欣海旁道'],
    nameSub: { zh: '钻石交易塔', en: 'Diamond Trading Tower' },
  },
  {
    matchEn: ['Rocky Road'],
    matchZh: ['巨石路'],
    nameSub: { zh: '北岛学校村', en: 'North Island School Village' },
  },
  {
    matchEn: ['Iris Point Station'],
    matchZh: ['虹尾角站'],
    nameSub: { zh: '智家坊, 彩色汇', en: 'I Home, Rainbow Center' },
  },
  {
    matchEn: ['Jardine Theater'],
    matchZh: ['宜和剧场', '宜和劇場'],
    nameSub: { zh: '长岛东医院', en: 'East Long Island Hospital' },
  },
]

function stripParentheticalSuffix(text: string): string {
  return text.replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim()
}

function normalizeEnKey(en: string): string {
  return stripParentheticalSuffix(en).toLowerCase()
}

function normalizeZhKey(zh: string): string {
  return stripParentheticalSuffix(zh)
}

export function lookupStopNameSub(name: BilingualText): BilingualText | undefined {
  const enKey = normalizeEnKey(name.en)
  const zhKey = normalizeZhKey(name.zh)

  for (const rule of STOP_NAME_SUB_RULES) {
    if (rule.matchEn.some((candidate) => normalizeEnKey(candidate) === enKey)) {
      return rule.nameSub
    }
    if (rule.matchZh?.some((candidate) => normalizeZhKey(candidate) === zhKey)) {
      return rule.nameSub
    }
  }

  return undefined
}

export function applyStopNameSubToStop<T extends {
  name: BilingualText
  nameSub?: BilingualText
  turningPoint?: boolean
}>(stop: T): T {
  if (stop.turningPoint || stop.nameSub) return stop
  const nameSub = lookupStopNameSub(stop.name)
  if (!nameSub) return stop
  return { ...stop, nameSub }
}
