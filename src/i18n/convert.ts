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

export function convertToTraditional(text: string): string {
  if (!text) return text
  if (!toTraditional) {
    toTraditional = Converter({ from: 'cn', to: 'tw' })
  }
  let out = toTraditional(text)
  for (const [from, to] of TW_PHRASE_FIXES) {
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
