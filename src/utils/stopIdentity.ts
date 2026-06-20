import { convertToSimplified } from '../i18n/convert'
import { resolvePlaceZh } from './placeNames'

const ARABIC_DIGIT_TO_ZH: Record<string, string> = {
  '0': '零',
  '1': '一',
  '2': '二',
  '3': '三',
  '4': '四',
  '5': '五',
  '6': '六',
  '7': '七',
  '8': '八',
  '9': '九',
}

function arabicZoneToChinese(text: string): string {
  return text.replace(/第(\d+)区/g, (_, digits: string) => {
    const zhDigits = [...digits].map((d) => ARABIC_DIGIT_TO_ZH[d] ?? d).join('')
    return `第${zhDigits}区`
  })
}

function normalizeChineseStop(text: string): string {
  return arabicZoneToChinese(
    convertToSimplified(resolvePlaceZh(text, ''))
      .replace(/\^\^/g, '')
      .replace(/[－\-–—]/g, '')
      .replace(/（.*?）/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/巴士总站$/u, '')
      .replace(/总站$/u, '')
      .replace(/落客站?$/u, '')
      .replace(/上客站?$/u, '')
      .replace(/[东南西北]行$/u, '')
      .replace(/海[旁傍]路/g, '海旁道')
      .replace(/海傍道/g, '海旁道')
      .trim()
      .toLowerCase(),
  )
}

function isWikiNoiseEnglish(text: string): boolean {
  const t = text.trim().toLowerCase()
  return (
    !t ||
    t.startsWith('subject =') ||
    t.includes('section fare') ||
    t.includes('two-way section') ||
    t.includes('players can get food') ||
    t.includes('is located here')
  )
}

function normalizeEnglishStop(text: string): string {
  if (isWikiNoiseEnglish(text)) return ''
  return text
    .trim()
    .toLowerCase()
    .replace(/\s*bus terminus$/i, '')
    .replace(/\s+columbarium$/i, '')
    .replace(/\s+brt station$/i, '')
    .replace(/\s+ferry pier$/i, '')
    .replace(/\s+shopping center$/i, '')
    .replace(/\s+shopping centre$/i, '')
    .replace(/\s+terminus$/i, '')
    .replace(/\s+terminal$/i, '')
    .replace(/centre/g, 'center')
    .replace(/\s+/g, ' ')
}

/** 用于步行接驳、换乘枢纽等同站不同写法匹配 */
export function canonicalStopKey(zh: string, en: string): string {
  const z = normalizeChineseStop(zh)
  if (/[\u4e00-\u9fff]/.test(z)) return z
  const e = normalizeEnglishStop(en)
  return `${z}|${e}`
}

export function stopsMatch(
  a: { zh: string; en: string },
  b: { zh: string; en: string },
): boolean {
  return canonicalStopKey(a.zh, a.en) === canonicalStopKey(b.zh, b.en)
}
