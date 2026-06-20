import type { BusRoute } from '../types/route'
import type { MatchedStop } from './routeStopLookup'
import { stopKey } from './routeBetweenStops'

export interface RouteLeg {
  route: BusRoute
  directionIndex: number
  from: MatchedStop
  to: MatchedStop
}

export interface TransferPlan {
  legs: RouteLeg[]
  transferCount: number
}

interface SearchState {
  stop: MatchedStop
  legs: RouteLeg[]
  visited: Set<string>
}

function expandLegsFromStop(
  current: MatchedStop,
  displayRoutes: BusRoute[],
  routeFilter: (route: BusRoute) => boolean,
): RouteLeg[] {
  const currentKey = stopKey(current.zh, current.en)
  const legs: RouteLeg[] = []

  for (const route of displayRoutes) {
    if (!routeFilter(route)) continue

    for (let directionIndex = 0; directionIndex < (route.stops?.length ?? 0); directionIndex++) {
      const list = route.stops?.[directionIndex]?.list
      if (!list?.length) continue

      let fromIndex = -1
      for (let i = 0; i < list.length; i++) {
        const stop = list[i]!
        if (stopKey(stop.name.zh, stop.name.en) === currentKey) {
          fromIndex = i
          break
        }
      }
      if (fromIndex < 0) continue

      for (let toIndex = fromIndex + 1; toIndex < list.length; toIndex++) {
        const stop = list[toIndex]!
        legs.push({
          route,
          directionIndex,
          from: current,
          to: { zh: stop.name.zh, en: stop.name.en },
        })
      }
    }
  }

  return legs
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

/** 同一线路组合（如 140 → 140P）只保留站数最少的一条 */
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

/** 转车方案 BFS：优先少转车，不足 minPlans 条时逐步加深转车次数 */
export function findTransferPlansBetweenStops(
  from: MatchedStop,
  to: MatchedStop,
  displayRoutes: BusRoute[],
  routeFilter: (route: BusRoute) => boolean,
  options?: { minPlans?: number; maxLegs?: number; maxPlans?: number },
): TransferPlan[] {
  const minPlans = options?.minPlans ?? 6
  const maxLegs = options?.maxLegs ?? 6
  const maxPlans = options?.maxPlans ?? 12
  const fromKey = stopKey(from.zh, from.en)
  const toKey = stopKey(to.zh, to.en)
  if (fromKey === toKey) return []

  let frontier: SearchState[] = [{ stop: from, legs: [], visited: new Set([fromKey]) }]
  const collected: TransferPlan[] = []

  const sortPlans = (plans: TransferPlan[]) =>
    plans.sort((a, b) => {
      if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount
      return transferPlanJourneyStopCount(a) - transferPlanJourneyStopCount(b)
    })

  for (let depth = 0; depth < maxLegs && frontier.length > 0; depth++) {
    const nextFrontier: SearchState[] = []

    for (const state of frontier) {
      for (const leg of expandLegsFromStop(state.stop, displayRoutes, routeFilter)) {
        const nextKey = stopKey(leg.to.zh, leg.to.en)
        if (state.visited.has(nextKey)) continue

        const nextLegs = [...state.legs, leg]

        if (nextKey === toKey) {
          if (nextLegs.length >= 2) {
            collected.push({ legs: nextLegs, transferCount: nextLegs.length - 1 })
          }
          continue
        }

        const nextVisited = new Set(state.visited)
        nextVisited.add(nextKey)
        nextFrontier.push({ stop: leg.to, legs: nextLegs, visited: nextVisited })
      }
    }

    const deduped = sortPlans(dedupeTransferPlansByRouteChain(collected))
    if (deduped.length >= minPlans) {
      return deduped.slice(0, maxPlans)
    }

    frontier = nextFrontier
  }

  return sortPlans(dedupeTransferPlansByRouteChain(collected)).slice(0, maxPlans)
}
