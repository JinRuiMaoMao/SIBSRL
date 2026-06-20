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

/** 最少乘车段数的转车方案（BFS）；乘车段数 = 转车次数 + 1 */
export function findTransferPlansBetweenStops(
  from: MatchedStop,
  to: MatchedStop,
  displayRoutes: BusRoute[],
  routeFilter: (route: BusRoute) => boolean,
  options?: { maxLegs?: number; maxPlans?: number },
): TransferPlan[] {
  const maxLegs = options?.maxLegs ?? 3
  const maxPlans = options?.maxPlans ?? 8
  const fromKey = stopKey(from.zh, from.en)
  const toKey = stopKey(to.zh, to.en)
  if (fromKey === toKey) return []

  let frontier: SearchState[] = [{ stop: from, legs: [], visited: new Set([fromKey]) }]
  const results: TransferPlan[] = []
  let targetLegCount: number | null = null

  for (let depth = 0; depth < maxLegs && frontier.length > 0; depth++) {
    const nextFrontier: SearchState[] = []

    for (const state of frontier) {
      for (const leg of expandLegsFromStop(state.stop, displayRoutes, routeFilter)) {
        const nextKey = stopKey(leg.to.zh, leg.to.en)
        if (state.visited.has(nextKey)) continue

        const nextLegs = [...state.legs, leg]

        if (nextKey === toKey) {
          targetLegCount = targetLegCount ?? nextLegs.length
          if (nextLegs.length === targetLegCount) {
            results.push({ legs: nextLegs, transferCount: nextLegs.length - 1 })
          }
          continue
        }

        if (targetLegCount != null && nextLegs.length >= targetLegCount) continue

        const nextVisited = new Set(state.visited)
        nextVisited.add(nextKey)
        nextFrontier.push({ stop: leg.to, legs: nextLegs, visited: nextVisited })
      }
    }

    if (targetLegCount != null) break
    frontier = nextFrontier
  }

  return results
    .sort((a, b) => {
      if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount
      const aStops = a.legs.reduce((sum, leg) => sum + 1, 0)
      const bStops = b.legs.reduce((sum, leg) => sum + 1, 0)
      return aStops - bStops
    })
    .slice(0, maxPlans)
}
