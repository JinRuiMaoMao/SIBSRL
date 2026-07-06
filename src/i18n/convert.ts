import { Converter } from 'opencc-js'

let toTraditional: ((text: string) => string) | null = null
let toSimplified: ((text: string) => string) | null = null

/** OpenCC 后修正：游戏内「亚历山」站名不带「大」 */
const TW_PHRASE_FIXES: [string, string][] = [
  ['亞歷山大教堂', '亞歷山教堂'],
  ['亞歷山大花園', '亞歷山花園'],
  ['亚历山大教堂', '亞歷山教堂'],
  ['亚历山大花园', '亞歷山花園'],
]

/** OpenCC 会把 Lane 站名的「里」误转为「裡」；已知站名与通用后缀一并修正。 */
const LANE_STOP_ZH_FIXES: [string, string][] = [
  ['楓樹裡', '楓樹里'],
  ['枫树裡', '枫树里'],
  ['時間裡', '時間里'],
  ['时间裡', '时间里'],
  ['賴得裡', '賴得里'],
  ['赖得裡', '赖得里'],
]

const LANE_STOP_EN = /\bLane\s*$/i

export function isLaneStopEnglish(en: string | undefined): boolean {
  return !!en?.trim() && LANE_STOP_EN.test(en.trim())
}

/** 英文以 Lane 结尾的站名：繁体显示用「里」作地名后缀，不用 OpenCC 的「裡」。 */
export function fixLaneStopChinese(zh: string, en?: string): string {
  if (!zh) return zh
  if (en && !isLaneStopEnglish(en)) return zh

  let out = zh
  for (const [from, to] of LANE_STOP_ZH_FIXES) {
    out = out.split(from).join(to)
  }
  if (en && isLaneStopEnglish(en)) {
    out = out.replace(/([一-龥])裡(?=$|[,，、/\s·]|（|\()/g, '$1里')
  }
  return out
}

export function convertToTraditional(text: string): string {
  if (!text) return text
  if (!toTraditional) {
    toTraditional = Converter({ from: 'cn', to: 'tw' })
  }
  let out = toTraditional(text)
  for (const [from, to] of TW_PHRASE_FIXES) {
    out = out.split(from).join(to)
  }
  for (const [from, to] of LANE_STOP_ZH_FIXES) {
    out = out.split(from).join(to)
  }
  return out
}

export function convertToSimplified(text: string): string {
  if (!text) return text
  if (!/[\u4e00-\u9fff]/.test(text)) return text
  if (!toSimplified) {
    toSimplified = Converter({ from: 'tw', to: 'cn' })
  }
  return toSimplified(text)
}
