import { convertToSimplified } from '../i18n/convert'
import type { BilingualText, BusRoute } from '../types/route'
import {
  isPlaceholderEndpoint,
  resolvePlaceName,
} from './placeNames'
import {
  buildBestRouteVia,
  localizeVia,
} from './routeVia'

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

function localizeSchedulePhrase(s: string, preferChinese: boolean): string {
  if (!preferChinese || !s) return s
  return (
    s
      .replace(/Mon\s*–\s*Fri/gi, '周一至五')
      .replace(/Mon-Fri/gi, '周一至五')
      .replace(/Weekends?/gi, '周末')
      .replace(/Marathon Special Service/gi, '马拉松特别服务')
      .replace(/Depend on actual situation/gi, '视实际班次')
      .replace(/Depends on ridership/gi, '视客量')
      .replace(/Fixed departures/gi, '固定班次')
      .replace(/Fixed departure/gi, '固定班次')
      .replace(/School Days/gi, '上课日')
      .replace(/major events only/gi, '仅大型活动')
      .replace(/Per event/gi, '按活动')
      .replace(/Towards /gi, '往')
      .replace(/To /gi, '往')
      .replace(/approx\.\s*/gi, '约 ')
      .replace(/\bmins?\b/gi, '分钟')
      .replace(/\bminutes?\b/gi, '分钟')
  )
}

/** 区号 7/8、Zones 7/8、日期 2024/6 等：勿按「/」拆成多段简介 */
function shouldPreserveSlashInText(t: string): boolean {
  if (/\d{1,2}\s*\/\s*\d{1,2}\s*区/.test(t)) return true
  if (/[Zz]ones?\s+\d{1,2}\s*\/\s*\d{1,2}/i.test(t)) return true
  if (/\d{4}\s*\/\s*\d{1,2}(?!\d)/.test(t)) return true
  if (/第\s*\d{1,2}\s*\/\s*\d{1,2}\s*区/.test(t)) return true
  return false
}

/** 双向里程 / 分方向行车时间等：保留全部片段，勿只取第一段 */
function isMultiDirectionSlashList(parts: string[]): boolean {
  if (parts.length < 2) return false
  if (parts.filter((p) => /km/i.test(p)).length >= 2) return true
  if (parts.filter((p) => /分钟|mins?\b/i.test(p)).length >= 2) return true
  if (parts.filter((p) => /\d{1,2}\s*:\s*\d{2}/.test(p)).length >= 2) return true
  if (parts.filter((p) => /^往/.test(p.trim()) || /^to\s/i.test(p.trim())).length >= 2) {
    return true
  }
  return false
}

function cleanPart(raw: string, preferChinese: boolean): string {
  let t = stripHtmlAndWikiNoise(raw)
    .replace(/\[\[|\]\]/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .trim()
  t = localizeSchedulePhrase(t, preferChinese)
  if (!t) return t
  if (t.includes('/') && !shouldPreserveSlashInText(t)) {
    const parts = t
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean)
    if (isMultiDirectionSlashList(parts)) {
      return parts
        .map((p) => (preferChinese ? simplifyZh(p) : p.trim()))
        .join(' / ')
    }
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

/** Wiki 误把线路简介拼进「服务时间」时，只保留时刻表 */
function cleanServiceTime(text: BilingualText): BilingualText {
  const extractTimes = (raw: string): string => {
    let t = stripHtmlAndWikiNoise(raw).replace(/\}\}+.*$/, '').trim()
    if (/is operated by|Crew Bus Route|travelling between/i.test(t)) {
      const times = t.match(/\d{1,2}:\d{2}/g)
      return times?.length ? times.join('、') : ''
    }
    if (t.length > 72) {
      const times = t.match(/\d{1,2}:\d{2}/g)
      if (times?.length) return times.join('、')
    }
    return t.replace(/,\s*/g, '、').replace(/、+/g, '、').replace(/、$/, '')
  }
  const zh = simplifyZh(localizeSchedulePhrase(extractTimes(text.zh), true))
  const enRaw = extractTimes(text.en)
  const en = enRaw.replace(/、/g, ', ')
  return { zh, en: en || zh.replace(/、/g, ', ') }
}

function isBrokenText(s: string): boolean {
  return (
    /\[\[|Category:|\.png|gallery|File:|<p\s|h\.p_/i.test(s) ||
    /^\d+[A-Z#*]*\}\}/i.test(s) ||
    s.length > 120 ||
    /^Departs at|^Timing Point|^Refer to/i.test(s)
  )
}

function isTimetablePlaceholder(s: string): boolean {
  return /Refer to the information in the ["']?Timetable/i.test(s) || /<! –/.test(s)
}

function cleanScheduleMeta(text: BilingualText | undefined): BilingualText | undefined {
  if (!text) return undefined
  if (isTimetablePlaceholder(text.zh) || isTimetablePlaceholder(text.en)) return undefined
  const cleaned = cleanBilingual(text)
  if (!cleaned.zh.trim() && !cleaned.en.trim()) return undefined
  return cleaned
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

function destinationFromDirection(direction: BilingualText): BilingualText | undefined {
  for (const text of [direction.zh, direction.en]) {
    const m = text.match(/[→→]\s*([^）)\n]+)/)
    if (!m?.[1]) continue
    const dest = m[1].replace(/\}\}.*/, '').trim()
    if (!dest || dest.length > 48 || isBrokenText(dest)) continue
    return { zh: dest, en: dest }
  }
  return undefined
}

function repairStopList(list: StopGroup['list'], direction: BilingualText): StopGroup['list'] {
  if (!list.length) return list
  const last = list[list.length - 1]
  if (!isBrokenText(last.name.zh) && !isBrokenText(last.name.en)) return list
  const dest = destinationFromDirection(direction)
  if (!dest) return list.slice(0, -1)
  const repaired = [...list]
  repaired[repaired.length - 1] = { ...last, name: cleanBilingual(dest) }
  return repaired
}

/** Wiki 站序表 rowspan 合并区域格：向前继承；首段无区域时向后继承 */
function fillStopZones(list: StopGroup['list']): StopGroup['list'] {
  if (!list.length) return list

  const filled = list.map((s) => ({ ...s }))
  let lastZone: number | undefined

  for (let i = 0; i < filled.length; i++) {
    const stop = filled[i]!
    if (stop.zone != null) {
      lastZone = stop.zone
    } else if (lastZone != null) {
      stop.zone = lastZone
    }
  }

  let nextZone: number | undefined
  for (let i = filled.length - 1; i >= 0; i--) {
    const stop = filled[i]!
    if (stop.zone != null) {
      nextZone = stop.zone
    } else if (nextZone != null) {
      stop.zone = nextZone
    }
  }

  return filled
}

function normalizeStopGroup(group: StopGroup): StopGroup {
  const list = fillStopZones(
    repairStopList(group.list, group.direction)
      .filter((s) => !isBrokenText(s.name.en) && !isBrokenText(s.name.zh))
      .map((s) => ({
        ...s,
        name: cleanBilingual(s.name),
      })),
  )

  return {
    ...group,
    direction: cleanBilingual(group.direction),
    serviceTime: group.serviceTime ? cleanServiceTime(group.serviceTime) : undefined,
    length: group.length ? cleanBilingual(group.length) : undefined,
    list,
  }
}

/** 修正 Wiki 导入的起终点、经停、站名与里程字段 */
export function normalizeRouteData(route: BusRoute): BusRoute {
  let next: BusRoute = {
    ...route,
    origin: cleanBilingual(route.origin),
    destination: cleanBilingual(route.destination),
    via: route.via ? localizeVia(cleanBilingual(route.via)) : undefined,
    interval: cleanScheduleMeta(route.interval) ?? (route.interval ? cleanBilingual(route.interval) : undefined),
    journeyTime: route.journeyTime ? cleanBilingual(route.journeyTime) : undefined,
    length: route.length ? cleanBilingual(route.length) : undefined,
    serviceTime:
      cleanScheduleMeta(route.serviceTime) ??
      (route.serviceTime ? cleanServiceTime(route.serviceTime) : undefined),
    notes: route.notes ? cleanBilingual(route.notes) : undefined,
    stops: route.stops?.map(normalizeStopGroup),
  }

  next = syncEndpointsFromStops(next)

  if (next.stops?.length) {
    const fromStops = buildBestRouteVia(next)
    if (fromStops) {
      next = { ...next, via: fromStops }
    } else if (next.via) {
      next = { ...next, via: localizeVia(next.via) }
    }
  } else if (next.via) {
    next = { ...next, via: localizeVia(next.via) }
  }

  return next
}
