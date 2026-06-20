import {
  findRouteForDailyChallenge,
  isPrivateHireChallengeRoute,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import { getRouteDisplayGroupsForRoute } from '../data/routeDisplayGroups'
import { isSeasonalRouteUnlocked } from '../data/seasonalRouteAvailability'
import type { BusRoute } from '../types/route'
import { isRouteStopDataComplete } from './routeCompleteness'

function isTodaysDailyChallengeRoute(
  route: BusRoute,
  challenge: DailyChallengeInfo,
): boolean {
  const routeNumber = challenge.routeNumber?.trim()
  if (!challenge.isAvailable || !routeNumber || isPrivateHireChallengeRoute(routeNumber)) {
    return false
  }

  const todayRoute = findRouteForDailyChallenge(routeNumber)
  return todayRoute?.id === route.id
}

/** 行程规划（随机 / 两站直达 / 转车）：常规 + 当日挑战 + 已开放季节限定 */
export function isRouteEligibleForTripPlanning(
  route: BusRoute,
  dailyChallenge: DailyChallengeInfo,
  now = new Date(),
): boolean {
  if (!isRouteStopDataComplete(route)) return false

  const groups = getRouteDisplayGroupsForRoute(route)
  if (groups.includes('normal')) return true
  if (groups.includes('daily') && isTodaysDailyChallengeRoute(route, dailyChallenge)) return true
  if (groups.includes('seasonal') && isSeasonalRouteUnlocked(route, now)) return true

  return false
}

/** @deprecated 使用 isRouteEligibleForTripPlanning */
export const isRouteEligibleForRandomPool = isRouteEligibleForTripPlanning

export function buildRandomEligibleRoutes(
  routes: BusRoute[],
  dailyChallenge: DailyChallengeInfo,
  now = new Date(),
): BusRoute[] {
  return routes.filter((route) => isRouteEligibleForTripPlanning(route, dailyChallenge, now))
}

export function matchesTripPlanningRoute(
  route: BusRoute,
  dailyChallenge: DailyChallengeInfo,
  matchesUserFilters: (route: BusRoute) => boolean,
  now = new Date(),
): boolean {
  return matchesUserFilters(route) && isRouteEligibleForTripPlanning(route, dailyChallenge, now)
}
