import type { BusRoute } from '../types/route'
import type { RouteLeg, TransferPlan } from '../types/transferPlan'
import type { MatchedStop } from './routeStopLookup'
import { stopKey } from './routeBetweenStops'
import { filterTransferPlansByTimetable } from './routeTimetableFeasibility'

export type { RouteLeg, TransferPlan } from '../types/transferPlan'

interface StopRoutePosition {
  route: BusRoute
  directionIndex: number
  stopIndex: number
}

interface SearchState {
  stop: MatchedStop
  legs: RouteLeg[]
  visited: Set<string>
}

const DEFAULT_MIN_PLANS = 6
const DEFAULT_MAX_TRANSFERS = 3
const DEFAULT_MAX_PLANS = 12
const TOPOLOGICAL_COLLECT_TARGET = 24
const MAX_FRONTIER_STATES = 1200
const MAX_RAW_COLLECTED = 96
const MAX_LEGS_PER_EXPANSION = 72

/** 至少被两条不同线路使用的站，才视为可转车站 */
export function buildTransferHubStopKeys(displayRoutes: BusRoute[]): Set<string> {
  const routeIdsByStop = new Map<string, Set<string>>()

  for (const route of displayRoutes) {
    for (const group of route.stops ?? []) {
      for (const stop of group.list) {
        const key = stopKey(stop.name.zh, stop.name.en)
        let routeIds = routeIdsByStop.get(key)
        if (!routeIds) {
          routeIds = new Set<string>()
          routeIdsByStop.set(key, routeIds)
        }
        routeIds.add(route.id)
      }
    }
  }

  const hubs = new Set<string>()
  for (const [key, routeIds] of routeIdsByStop) {
    if (routeIds.size >= 2) hubs.add(key)
  }
  return hubs
}

function buildStopRouteIndex(
  displayRoutes: BusRoute[],
  routeFilter: (route: BusRoute) => boolean,
): Map<string, StopRoutePosition[]> {
  const index = new Map<string, StopRoutePosition[]>()

  for (const route of displayRoutes) {
    if (!routeFilter(route)) continue

    for (let directionIndex = 0; directionIndex < (route.stops?.length ?? 0); directionIndex++) {
      const list = route.stops?.[directionIndex]?.list
      if (!list?.length) continue

      for (let stopIndex = 0; stopIndex < list.length; stopIndex++) {
        const stop = list[stopIndex]!
        const key = stopKey(stop.name.zh, stop.name.en)
        const positions = index.get(key)
        const entry: StopRoutePosition = { route, directionIndex, stopIndex }
        if (positions) positions.push(entry)
        else index.set(key, [entry])
      }
    }
  }

  return index
}

function expandLegsFromStop(
  current: MatchedStop,
  stopRouteIndex: Map<string, StopRoutePosition[]>,
  toKey: string,
  transferHubs: Set<string>,
): RouteLeg[] {
  const currentKey = stopKey(current.zh, current.en)
  const positions = stopRouteIndex.get(currentKey)
  if (!positions?.length) return []

  const legs: RouteLeg[] = []

  for (const { route, directionIndex, stopIndex: fromIndex } of positions) {
    const list = route.stops?.[directionIndex]?.list
    if (!list?.length) continue

    for (let toIndex = fromIndex + 1; toIndex < list.length; toIndex++) {
      const stop = list[toIndex]!
      const nextKey = stopKey(stop.name.zh, stop.name.en)
      if (nextKey !== toKey && !transferHubs.has(nextKey)) continue

      legs.push({
        route,
        directionIndex,
        from: current,
        to: { zh: stop.name.zh, en: stop.name.en },
      })
    }
  }

  if (legs.length <= MAX_LEGS_PER_EXPANSION) return legs

  // 枢纽站可组合爆炸：优先保留更短区间与能直达终点的段
  return legs
    .sort((a, b) => {
      const aToDest = stopKey(a.to.zh, a.to.en) === toKey ? 0 : 1
      const bToDest = stopKey(b.to.zh, b.to.en) === toKey ? 0 : 1
      if (aToDest !== bToDest) return aToDest - bToDest
      return a.route.number.localeCompare(b.route.number, undefined, { numeric: true })
    })
    .slice(0, MAX_LEGS_PER_EXPANSION)
}

/** 列出某段乘车区间内经过的站点（含起终点） */
export function getStopsOnLeg(leg: RouteLeg): MatchedStop[] {
  const list = leg.route.stops?.[leg.directionIndex]?.list
  if (!list?.length) return [leg.from, leg.to]

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

  if (fromIndex < 0 || toIndex < fromIndex) return [leg.from, leg.to]

  return list.slice(fromIndex, toIndex + 1).map((stop) => ({
    zh: stop.name.zh,
    en: stop.name.en,
  }))
}

export function formatTransferPlanRouteChain(plan: TransferPlan): string {
  return plan.legs.map((leg) => leg.route.number).join(' → ')
}

function transferPlanRouteChainKey(plan: TransferPlan): string {
  return plan.legs.map((leg) => leg.route.number).join('\0')
}

function transferPlanJourneyStopCount(plan: TransferPlan): number {
  let count = 0
  for (let legIndex = 0; legIndex < plan.legs.length; legIndex++) {
    const stops = getStopsOnLeg(plan.legs[legIndex]!)
    count += legIndex === 0 ? stops.length : Math.max(0, stops.length - 1)
  }
  return count
}

function dedupeTransferPlansByRouteChain(plans: TransferPlan[]): TransferPlan[] {
  const bestByChain = new Map<string, TransferPlan>()

  for (const plan of plans) {
    const key = transferPlanRouteChainKey(plan)
    const existing = bestByChain.get(key)
    if (!existing) {
      bestByChain.set(key, plan)
      continue
    }

    const planStops = transferPlanJourneyStopCount(plan)
    const existingStops = transferPlanJourneyStopCount(existing)
    if (
      plan.transferCount < existing.transferCount ||
      (plan.transferCount === existing.transferCount && planStops < existingStops)
    ) {
      bestByChain.set(key, plan)
    }
  }

  return [...bestByChain.values()]
}

function sortPlans(plans: TransferPlan[]): TransferPlan[] {
  return plans.sort((a, b) => {
    if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount
    return transferPlanJourneyStopCount(a) - transferPlanJourneyStopCount(b)
  })
}

function finalizePlans(
  collected: TransferPlan[],
  maxPlans: number,
): TransferPlan[] {
  const deduped = sortPlans(dedupeTransferPlansByRouteChain(collected))
  const filtered = filterTransferPlansByTimetable(deduped)
  if (filtered.length > 0) return filtered.slice(0, maxPlans)
  return deduped.slice(0, maxPlans)
}

function tryCollectPlan(
  collected: TransferPlan[],
  seenChains: Set<string>,
  nextLegs: RouteLeg[],
): void {
  if (collected.length >= MAX_RAW_COLLECTED) return
  const plan: TransferPlan = {
    legs: nextLegs,
    transferCount: nextLegs.length - 1,
  }
  seenChains.add(transferPlanRouteChainKey(plan))
  collected.push(plan)
}

/** 转车方案 BFS：优先少转车，不足 minPlans 条时逐步加深转车次数 */
export function findTransferPlansBetweenStops(
  from: MatchedStop,
  to: MatchedStop,
  displayRoutes: BusRoute[],
  routeFilter: (route: BusRoute) => boolean,
  options?: { minPlans?: number; maxLegs?: number; maxPlans?: number },
): TransferPlan[] {
  const minPlans = options?.minPlans ?? DEFAULT_MIN_PLANS
  const maxTransfers = Math.max(1, (options?.maxLegs ?? DEFAULT_MAX_TRANSFERS + 1) - 1)
  const maxPlans = options?.maxPlans ?? DEFAULT_MAX_PLANS
  const fromKey = stopKey(from.zh, from.en)
  const toKey = stopKey(to.zh, to.en)
  if (fromKey === toKey) return []

  const transferHubs = buildTransferHubStopKeys(displayRoutes)
  const stopRouteIndex = buildStopRouteIndex(displayRoutes, routeFilter)
  let frontier: SearchState[] = [{ stop: from, legs: [], visited: new Set([fromKey]) }]
  const collected: TransferPlan[] = []
  const seenChains = new Set<string>()

  for (let depth = 0; depth <= maxTransfers && frontier.length > 0; depth++) {
    const nextFrontier: SearchState[] = []

    for (const state of frontier) {
      for (const leg of expandLegsFromStop(state.stop, stopRouteIndex, toKey, transferHubs)) {
        const nextKey = stopKey(leg.to.zh, leg.to.en)
        if (state.visited.has(nextKey)) continue

        const nextLegs = [...state.legs, leg]

        if (nextKey === toKey) {
          if (nextLegs.length >= 2) {
            tryCollectPlan(collected, seenChains, nextLegs)
          }
          continue
        }

        const nextVisited = new Set(state.visited)
        nextVisited.add(nextKey)
        nextFrontier.push({ stop: leg.to, legs: nextLegs, visited: nextVisited })

        if (nextFrontier.length >= MAX_FRONTIER_STATES) break
      }
      if (nextFrontier.length >= MAX_FRONTIER_STATES) break
    }

    if (
      seenChains.size >= minPlans ||
      collected.length >= TOPOLOGICAL_COLLECT_TARGET ||
      collected.length >= MAX_RAW_COLLECTED ||
      nextFrontier.length >= MAX_FRONTIER_STATES
    ) {
      return finalizePlans(collected, maxPlans)
    }

    frontier = nextFrontier
  }

  return finalizePlans(collected, maxPlans)
}
