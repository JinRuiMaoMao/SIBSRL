import { convertToSimplified } from '../i18n/convert'
import { resolvePlaceZh } from './placeNames'

function normalizeChineseStop(text: string): string {
  return convertToSimplified(resolvePlaceZh(text, ''))
    .replace(/\^\^/g, '')
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/巴士总站$/u, '')
    .replace(/总站$/u, '')
    .trim()
    .toLowerCase()
}

function normalizeEnglishStop(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s*bus terminus$/i, '')
    .replace(/\s+/g, ' ')
}

/** 用于步行接驳、换乘枢纽等同站不同写法匹配 */
export function canonicalStopKey(zh: string, en: string): string {
  const z = normalizeChineseStop(zh)
  const e = normalizeEnglishStop(en)
  return `${z}|${e}`
}

export function stopsMatch(
  a: { zh: string; en: string },
  b: { zh: string; en: string },
): boolean {
  return canonicalStopKey(a.zh, a.en) === canonicalStopKey(b.zh, b.en)
}
