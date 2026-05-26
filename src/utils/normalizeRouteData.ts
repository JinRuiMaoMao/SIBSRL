import { convertToSimplified } from '../i18n/convert'
import type { BilingualText, BusRoute } from '../types/route'
import {
  isPlaceholderEndpoint,
  resolvePlaceName,
} from './placeNames'

type StopGroup = NonNullable<BusRoute['stops']>[number]

function simplifyZh(text: string): string {
  if (!text) return text
  return convertToSimplified(text)
}

function stripHtmlAndWikiNoise(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/\}\}\s*Category:[\s\S]*$/i, '')
    .replace(/Category:[\s\S]*$/i, '')
    .trim()
}

function cleanPart(raw: string, preferChinese: boolean): string {
  let t = stripHtmlAndWikiNoise(raw)
    .replace(/\[\[|\]\]/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .trim()
  if (!t) return t
  if (t.includes('/')) {
    const parts = t
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean)
    if (preferChinese) {
      return parts.find((p) => /[\u4e00-\u9fff]/.test(p)) ?? parts[0] ?? t
    }
    return (
      parts.find((p) => /[A-Za-z]{2,}/.test(p) && !/^[\u4e00-\u9fff]+$/.test(p)) ??
      parts[parts.length - 1] ??
      t
    )
  }
  return t
}

function cleanBilingual(text: BilingualText): BilingualText {
  const zh = simplifyZh(cleanPart(text.zh, true))
  const en = cleanPart(text.en, false)
  return resolvePlaceName(zh, en)
}

function isBrokenText(s: string): boolean {
  return (
    /\[\[|Category:|\.png|gallery|File:|<p\s|h\.p_/i.test(s) ||
    /^\d+[A-Z#*]*\}\}/i.test(s) ||
    s.length > 120 ||
    /^Departs at|^Timing Point|^Refer to/i.test(s)
  )
}

function isBrokenEndpoint(text: BilingualText): boolean {
  const joined = `${text.zh} ${text.en}`
  return (
    /\[\[/.test(joined) ||
    isBrokenText(text.zh) ||
    isBrokenText(text.en) ||
    (text.zh.includes('/') && /[A-Za-z]{3,}/.test(text.zh))
  )
}

function isUsableVia(via: BilingualText | undefined): boolean {
  if (!via) return false
  if (isBrokenText(via.zh) || isBrokenText(via.en)) return false
  if (!via.zh.trim() && !via.en.trim()) return false
  return true
}

function pickViaStops(list: StopGroup['list']): typeof list {
  if (list.length <= 2) return []
  const inner = list.slice(1, -1)
  if (inner.length <= 8) return inner
  const step = Math.max(1, Math.floor(inner.length / 7))
  return inner.filter((_, i) => i % step === 0)
}

function buildViaFromStopGroup(group: StopGroup | undefined): BilingualText | undefined {
  if (!group?.list.length) return undefined
  const picked = pickViaStops(group.list)
  if (!picked.length) return undefined
  return {
    zh: picked.map((s) => simplifyZh(s.name.zh)).join('、'),
    en: picked.map((s) => s.name.en).join(', '),
  }
}

function syncEndpointsFromStops(route: BusRoute): BusRoute {
  if (!route.stops?.length) return route
  const primary = route.stops[0]
  if (!primary.list.length) return route

  const origin = cleanBilingual(primary.list[0].name)
  const destination = cleanBilingual(primary.list[primary.list.length - 1].name)

  const placeholder = isPlaceholderEndpoint(route.origin, route.destination, route.number)
  if (!placeholder && !isBrokenEndpoint(origin) && !isBrokenEndpoint(destination)) {
    if (/[\u4e00-\u9fff]/.test(route.origin.zh) && /[\u4e00-\u9fff]/.test(route.destination.zh)) {
      return route
    }
  }

  if (isBrokenEndpoint(origin) || isBrokenEndpoint(destination)) return route
  return { ...route, origin, destination }
}

function normalizeStopGroup(group: StopGroup): StopGroup {
  return {
    ...group,
    direction: cleanBilingual(group.direction),
    serviceTime: group.serviceTime ? cleanBilingual(group.serviceTime) : undefined,
    length: group.length ? cleanBilingual(group.length) : undefined,
    list: group.list
      .filter((s) => !isBrokenText(s.name.en) && !isBrokenText(s.name.zh))
      .map((s) => ({
        ...s,
        name: cleanBilingual(s.name),
      })),
  }
}

/** 修正 Wiki 导入的起终点、经停、站名与里程字段 */
export function normalizeRouteData(route: BusRoute): BusRoute {
  let next: BusRoute = {
    ...route,
    origin: cleanBilingual(route.origin),
    destination: cleanBilingual(route.destination),
    via: route.via ? cleanBilingual(route.via) : undefined,
    interval: route.interval ? cleanBilingual(route.interval) : undefined,
    journeyTime: route.journeyTime ? cleanBilingual(route.journeyTime) : undefined,
    length: route.length ? cleanBilingual(route.length) : undefined,
    serviceTime: route.serviceTime ? cleanBilingual(route.serviceTime) : undefined,
    notes: route.notes ? cleanBilingual(route.notes) : undefined,
    stops: route.stops?.map(normalizeStopGroup),
  }

  next = syncEndpointsFromStops(next)

  if (!isUsableVia(next.via) && next.stops?.length) {
    const via =
      buildViaFromStopGroup(next.stops[0]) ??
      (next.stops[1] ? buildViaFromStopGroup(next.stops[1]) : undefined)
    if (via) next = { ...next, via }
  }

  return next
}
