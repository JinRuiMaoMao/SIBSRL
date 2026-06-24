import { getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { MessageKey } from '../i18n/messages'
import type { BusRoute } from '../types/route'
import type { RouteLeg, TransferPlan } from '../types/transferPlan'
import type { MatchedStop } from './routeStopLookup'
import { stopKey } from './routeBetweenStops'
import { resolveLengthKmForDataIndex } from './routeLength'
import { pickServiceTimeForDirection } from './routeSchedule'
import { routeHasDirectionVariants } from './routeDirectionCore'
import {
  MIN_TRANSFER_MINUTES,
  estimateLegHeadwayMinutes,
  estimateLegTravelMinutes,
  parseJourneyMinutes,
} from './routeTimetableFeasibility'

const KM_PER_STOP_FALLBACK = 0.72
const WALK_SPEED_KMH = 5

export interface TransferPlanMetrics {
  totalMinutes: number
  totalKm: number
  /** 各乘车段票价之和；无票价资料时为 null */
  totalFare: number | null
  /** 至少有一段里程或时间使用了 fallback 估算 */
  partiallyEstimated: boolean
  /** 票价为各线全票相加的估算（未按分段收费折算） */
  farePartiallyEstimated: boolean
}

function countLegStopSpan(leg: RouteLeg): { segmentStops: number; totalStops: number } {
  const list = leg.route.stops?.[leg.directionIndex]?.list
  if (!list?.length) return { segmentStops: 1, totalStops: 1 }

  const fromKey = stopKey(leg.from.zh, leg.from.en)
  const toKey = stopKey(leg.to.zh, leg.to.en)
  let fromIndex = -1
  let toIndex = -1

  for (let i = 0; i < list.length; i++) {
    const stop = list[i]!
    const key = stopKey(stop.name.zh, stop.name.en)
    if (key === fromKey) fromIndex = i
    if (key === toKey) toIndex = i
  }

  if (fromIndex < 0 || toIndex < fromIndex) return { segmentStops: 1, totalStops: 1 }

  return {
    segmentStops: Math.max(1, toIndex - fromIndex),
    totalStops: Math.max(1, list.length - 1),
  }
}

function resolveJourneyTimeText(leg: RouteLeg): string | null {
  const text = leg.route.journeyTime?.en ?? leg.route.journeyTime?.zh
  if (!text) return null
  if (routeHasDirectionVariants(leg.route)) {
    return pickServiceTimeForDirection(text, leg.route, leg.directionIndex)
  }
  return text
}

function legTravelUsesFallback(leg: RouteLeg): boolean {
  return parseJourneyMinutes(resolveJourneyTimeText(leg)) == null
}

function parseKmNumber(text: string | null | undefined): number | null {
  if (!text) return null
  const match = text.match(/([\d.]+)\s*km/i)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function estimateLegTravelKm(leg: RouteLeg, locale: Locale): { km: number; estimated: boolean } {
  const { segmentStops, totalStops } = countLegStopSpan(leg)
  const kmDisplay = resolveLengthKmForDataIndex(leg.route, leg.directionIndex, locale)
  const fullKm = parseKmNumber(kmDisplay)

  if (fullKm != null) {
    const ratio = segmentStops / totalStops
    return {
      km: Math.max(0.1, Math.round(fullKm * ratio * 10) / 10),
      estimated: false,
    }
  }

  return {
    km: Math.max(0.1, Math.round(segmentStops * KM_PER_STOP_FALLBACK * 10) / 10),
    estimated: true,
  }
}

function estimateWalkKm(minutes: number): number {
  return Math.max(0.05, Math.round(((minutes * WALK_SPEED_KMH) / 60) * 10) / 10)
}

function parseFareAmount(text: string): number | null {
  const normalized = text.replace(/,/g, '')
  const match = normalized.match(/(?:HK\$|\$|¥|￥)?\s*([\d.]+)/i)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function resolveRouteFareText(route: BusRoute, locale: Locale): string | null {
  if (!route.fare) return null
  if (typeof route.fare === 'string') return route.fare
  return getPrimaryText(route.fare, locale) || null
}

function estimateLegFare(leg: RouteLeg, locale: Locale): number | null {
  const fareText = resolveRouteFareText(leg.route, locale)
  if (!fareText) return null
  return parseFareAmount(fareText)
}

/** 直达线路的单段方案，用于站间导航指标估算 */
export function buildDirectRouteTransferPlan(
  from: MatchedStop,
  to: MatchedStop,
  route: BusRoute,
  directionIndex: number,
): TransferPlan {
  return {
    legs: [{ route, directionIndex, from, to }],
    transferCount: 0,
  }
}

/** 估算方案总时间（候车 + 乘车 + 转车 + 步行）与总里程 */
export function estimateTransferPlanMetrics(
  plan: TransferPlan,
  locale: Locale = 'zh-Hans',
): TransferPlanMetrics {
  let totalMinutes = 0
  let totalKm = 0
  let totalFare = 0
  let hasFare = false
  let partiallyEstimated = false
  let farePartiallyEstimated = false

  if (plan.legs.length > 0) {
    totalMinutes += Math.round(estimateLegHeadwayMinutes(plan.legs[0]!) / 2)
  }

  for (let i = 0; i < plan.legs.length; i++) {
    const leg = plan.legs[i]!
    const { km, estimated: kmEstimated } = estimateLegTravelKm(leg, locale)
    totalMinutes += estimateLegTravelMinutes(leg)
    totalKm += km
    if (kmEstimated || legTravelUsesFallback(leg)) partiallyEstimated = true

    const legFare = estimateLegFare(leg, locale)
    if (legFare != null) {
      hasFare = true
      totalFare += legFare
      farePartiallyEstimated = true
    }

    if (i < plan.legs.length - 1) {
      totalMinutes += MIN_TRANSFER_MINUTES
      totalMinutes += Math.round(estimateLegHeadwayMinutes(plan.legs[i + 1]!) / 2)
    }
  }

  if (plan.walkToDestination) {
    totalMinutes += plan.walkToDestination.minutes
    totalKm += estimateWalkKm(plan.walkToDestination.minutes)
    partiallyEstimated = true
  }

  return {
    totalMinutes: Math.max(1, totalMinutes),
    totalKm: Math.round(totalKm * 10) / 10,
    totalFare: hasFare ? Math.round(totalFare * 10) / 10 : null,
    partiallyEstimated,
    farePartiallyEstimated,
  }
}

export function formatPlanDistanceKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function formatPlanFare(amount: number): string {
  const rounded = Math.round(amount * 10) / 10
  return `$${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}`
}

export interface TransferPlanMetricItems {
  distance: string
  time: string
  fare: string
  estimatedSuffix: string | null
}

export function formatTransferPlanMetricItems(
  metrics: TransferPlanMetrics,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): TransferPlanMetricItems {
  const estimatedSuffix =
    metrics.partiallyEstimated || metrics.farePartiallyEstimated
      ? t('transferPlanMetricsEstimated')
      : null

  return {
    distance: formatPlanDistanceKm(metrics.totalKm),
    time: t('transferPlanMetricMinutes', { minutes: metrics.totalMinutes }),
    fare:
      metrics.totalFare != null
        ? formatPlanFare(metrics.totalFare)
        : t('transferPlanMetricFareUnknown'),
    estimatedSuffix,
  }
}

/** @deprecated Prefer TransferPlanMetricsSummary with labeled distance/time/fare */
export function formatTransferPlanMetrics(
  metrics: TransferPlanMetrics,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  const items = formatTransferPlanMetricItems(metrics, t)
  const summary = t('transferPlanMetrics', {
    minutes: metrics.totalMinutes,
    distance: items.distance,
  })
  const farePart =
    metrics.totalFare != null
      ? ` · ${t('transferPlanMetricFare')} ${items.fare}`
      : ''
  const base = `${summary}${farePart}`
  if (!items.estimatedSuffix) return base
  return `${base}${items.estimatedSuffix}`
}
