import type { BusRoute } from '../types/route'
import type { MatchedStop } from './routeStopLookup'
import type { RouteLeg, TransferPlan, WalkSegment } from '../types/transferPlan'
import { findWalkLinksToDestination, type WalkLink } from '../data/walkLinks'
import {
  findDirectRoutesBetweenStops,
} from './routeBetweenStops'
import {
  findTransferPlansBetweenStops,
} from './stopTransferPlans'
import { isDirectRouteBetweenStopsFeasible } from './routeTimetableFeasibility'
import { canonicalStopKey, stopsMatch } from './stopIdentity'

const DEFAULT_MAX_WALK_PLANS = 8

function buildStopIndex(displayRoutes: BusRoute[]): Map<string, MatchedStop> {
  const index = new Map<string, MatchedStop>()

  for (const route of displayRoutes) {
    for (const group of route.stops ?? []) {
      for (const stop of group.list) {
        const key = canonicalStopKey(stop.name.zh, stop.name.en)
        if (!index.has(key)) {
          index.set(key, { zh: stop.name.zh, en: stop.name.en })
        }
      }
    }
  }

  return index
}

function resolveWalkBusEnd(link: WalkLink, stopIndex: Map<string, MatchedStop>): MatchedStop | null {
  const key = canonicalStopKey(link.from.zh, link.from.en)
  return stopIndex.get(key) ?? null
}

function walkSegment(busEnd: MatchedStop, destination: MatchedStop, minutes: number): WalkSegment {
  return { from: busEnd, to: destination, minutes }
}

function planChainKey(plan: TransferPlan): string {
  const bus = plan.legs.map((leg) => leg.route.number).join('\0')
  const walk = plan.walkToDestination
    ? `\0walk:${canonicalStopKey(plan.walkToDestination.from.zh, plan.walkToDestination.from.en)}→${canonicalStopKey(plan.walkToDestination.to.zh, plan.walkToDestination.to.en)}`
    : ''
  return `${bus}${walk}`
}

function attachWalk(plan: TransferPlan, busEnd: MatchedStop, destination: MatchedStop, minutes: number): TransferPlan {
  return {
    ...plan,
    walkToDestination: walkSegment(busEnd, destination, minutes),
  }
}

function sortWalkPlans(plans: TransferPlan[]): TransferPlan[] {
  return plans.sort((a, b) => {
    if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount
    const walkA = a.walkToDestination?.minutes ?? 0
    const walkB = b.walkToDestination?.minutes ?? 0
    if (walkA !== walkB) return walkA - walkB
    return a.legs.length - b.legs.length
  })
}

function dedupeWalkPlans(plans: TransferPlan[]): TransferPlan[] {
  const best = new Map<string, TransferPlan>()
  for (const plan of plans) {
    const key = planChainKey(plan)
    const existing = best.get(key)
    if (!existing) {
      best.set(key, plan)
      continue
    }
    if (plan.transferCount < existing.transferCount) {
      best.set(key, plan)
    }
  }
  return sortWalkPlans([...best.values()])
}

/** 巴士无法直达查询终点时，补充「巴士 + 末端步行」方案 */
export function findWalkTransferPlans(
  from: MatchedStop,
  to: MatchedStop,
  displayRoutes: BusRoute[],
  routeFilter: (route: BusRoute) => boolean,
  options?: { maxPlans?: number },
): TransferPlan[] {
  const destKey = canonicalStopKey(to.zh, to.en)
  const links = findWalkLinksToDestination(destKey)
  if (!links.length) return []

  const stopIndex = buildStopIndex(displayRoutes)
  const maxPlans = options?.maxPlans ?? DEFAULT_MAX_WALK_PLANS
  const collected: TransferPlan[] = []

  for (const link of links) {
    const busEnd = resolveWalkBusEnd(link, stopIndex)
    if (!busEnd || stopsMatch(from, busEnd) || stopsMatch(busEnd, to)) continue

    for (const { route, directionIndex } of findDirectRoutesBetweenStops(from, busEnd, displayRoutes)) {
      if (!routeFilter(route)) continue
      if (!isDirectRouteBetweenStopsFeasible(from, busEnd, route, directionIndex)) continue

      const leg: RouteLeg = {
        route,
        directionIndex,
        from,
        to: busEnd,
      }
      collected.push(
        attachWalk({ legs: [leg], transferCount: 0 }, busEnd, to, link.minutes),
      )
    }

    const busTransfers = findTransferPlansBetweenStops(from, busEnd, displayRoutes, routeFilter, {
      maxPlans: 6,
    })
    for (const plan of busTransfers) {
      collected.push(attachWalk(plan, busEnd, to, link.minutes))
    }
  }

  return dedupeWalkPlans(collected).slice(0, maxPlans)
}

export function mergeTransferAndWalkPlans(
  busPlans: TransferPlan[],
  walkPlans: TransferPlan[],
  maxPlans = 12,
): TransferPlan[] {
  return dedupeWalkPlans([...busPlans, ...walkPlans]).slice(0, maxPlans)
}
