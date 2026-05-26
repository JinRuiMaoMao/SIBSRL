import { convertToSimplified } from '../i18n/convert'
import { getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { BilingualText, BusRoute } from '../types/route'
import { resolvePlaceName, resolvePlaceZh } from './placeNames'

type StopGroup = NonNullable<BusRoute['stops']>[number]
type StopList = StopGroup['list']

const MAX_VIA_SUMMARY_STOPS = 12

function simplifyZh(text: string): string {
  if (!text) return text
  return convertToSimplified(text)
}

function isBrokenViaText(s: string): boolean {
  return (
    /\[\[|Category:|\.png|gallery|File:|<p\s|h\.p_/i.test(s) ||
    s.length > 120 ||
    /^Refer to/i.test(s)
  )
}

/** 经停字段是否可用（排除纯英文写在 zh 里、Wiki 垃圾） */
export function isUsableVia(via: BilingualText | undefined): boolean {
  if (!via) return false
  if (isBrokenViaText(via.zh) || isBrokenViaText(via.en)) return false
  if (!via.zh.trim() && !via.en.trim()) return false
  if (!/[\u4e00-\u9fff]/.test(via.zh) && /[A-Za-z]{2,}/.test(via.zh)) return false
  return true
}

/** 将逗号/顿号分隔的英文经停译为中文 */
export function localizeVia(via: BilingualText): BilingualText {
  if (isUsableVia(via) && /[\u4e00-\u9fff]/.test(via.zh)) {
    return {
      zh: simplifyZh(via.zh),
      en: via.en.trim() || via.zh,
    }
  }
  const raw = (via.en || via.zh).trim()
  const parts = raw
    .split(/\s+and\s+|[,、]/i)
    .map((p) => p.replace(/\s*\([^)]*\)\s*/g, '').replace(/\s*←\s*/g, '').trim())
    .filter((p) => p && !/^\(.*\)$/.test(p))
  if (!parts.length) return { zh: '', en: '' }

  const zhParts = parts.map((p) => simplifyZh(resolvePlaceZh(p, p)))
  return {
    zh: zhParts.join('、'),
    en: parts.join(', '),
  }
}

function dedupeAdjacentStops(list: StopList): StopList {
  const out: StopList = []
  let prevKey = ''
  for (const stop of list) {
    const name = resolvePlaceName(stop.name.zh, stop.name.en)
    const key = `${name.zh}|${name.en}`
    if (key === prevKey) continue
    prevKey = key
    out.push(stop)
  }
  return out
}

/** 该方向全部经停站（不含首末站，去重相邻同名） */
export function getIntermediateStopList(group: StopGroup | undefined): StopList {
  if (!group?.list.length || group.list.length <= 2) return []
  const inner = dedupeAdjacentStops(group.list.slice(1, -1))
  return inner.filter((s) => {
    const zh = s.name.zh.trim()
    const en = s.name.en.trim()
    return (zh || en) && !isBrokenViaText(zh) && !isBrokenViaText(en)
  })
}

function pickViaStopsForSummary(list: StopList): StopList {
  if (list.length <= MAX_VIA_SUMMARY_STOPS) return list
  const step = Math.max(1, Math.floor(list.length / MAX_VIA_SUMMARY_STOPS))
  return list.filter((_, i) => i % step === 0).slice(0, MAX_VIA_SUMMARY_STOPS)
}

function viaTextFromStopList(list: StopList): BilingualText | undefined {
  if (!list.length) return undefined
  const names = list.map((s) => resolvePlaceName(s.name.zh, s.name.en))
  return {
    zh: names.map((n) => n.zh).join('、'),
    en: names.map((n) => n.en).join(', '),
  }
}

/** 从该方向站序中间站生成经停摘要 */
export function buildViaFromStopGroup(group: StopGroup | undefined): BilingualText | undefined {
  const inner = getIntermediateStopList(group)
  if (!inner.length) return undefined
  return viaTextFromStopList(pickViaStopsForSummary(inner))
}

/** 详情页：当前方向全部经停站名 */
export function getDirectionIntermediateStops(
  route: BusRoute,
  stopDataIndex: number,
  locale: Locale,
): string[] {
  const group = route.stops?.[stopDataIndex]
  return getIntermediateStopList(group).map((s) =>
    getPrimaryText(resolvePlaceName(s.name.zh, s.name.en), locale),
  )
}

/** 从各方向站序中选取经停最完整者，写入路线级 via */
export function buildBestRouteVia(route: BusRoute): BilingualText | undefined {
  if (!route.stops?.length) return undefined
  let best: BilingualText | undefined
  let bestCount = 0
  for (const group of route.stops) {
    const inner = getIntermediateStopList(group)
    const via = viaTextFromStopList(inner)
    if (via && inner.length > bestCount) {
      best = via
      bestCount = inner.length
    }
  }
  return best
}

/** 详情/卡片：当前方向的经停（优先完整站序，其次路线级经停并中文化） */
export function getDirectionVia(
  route: BusRoute,
  stopDataIndex: number,
): BilingualText | undefined {
  const group = route.stops?.[stopDataIndex]
  const fromStops = buildViaFromStopGroup(group)
  if (fromStops?.zh.trim()) return fromStops

  if (route.via) {
    const localized = localizeVia(route.via)
    if (localized.zh.trim()) return localized
  }

  return undefined
}
