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

/** 随机奖池：常规线路 + 当日挑战（若是今天）+ 已开放的季节限定 */
export function isRouteEligibleForRandomPool(
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

export function buildRandomEligibleRoutes(
  routes: BusRoute[],
  dailyChallenge: DailyChallengeInfo,
  now = new Date(),
): BusRoute[] {
  return routes.filter((route) => isRouteEligibleForRandomPool(route, dailyChallenge, now))
}
