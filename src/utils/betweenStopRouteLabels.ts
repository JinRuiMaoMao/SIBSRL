import {
  findRouteForDailyChallenge,
  isPrivateHireChallengeRoute,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import { getRouteDisplayGroupsForRoute } from '../data/routeDisplayGroups'
import { isSeasonalRouteUnlocked } from '../data/seasonalRouteAvailability'
import type { BusRoute } from '../types/route'

export type BetweenStopRouteBadgeKey = 'seasonal' | 'daily' | 'tripPoolExcluded'

function isTodaysDailyChallengeRoute(route: BusRoute, challenge: DailyChallengeInfo): boolean {
  const routeNumber = challenge.routeNumber?.trim()
  if (!challenge.isAvailable || !routeNumber || isPrivateHireChallengeRoute(routeNumber)) {
    return false
  }
  const todayRoute = findRouteForDailyChallenge(routeNumber)
  return todayRoute?.id === route.id
}

export function getBetweenStopRouteBadgeKeys(
  route: BusRoute,
  dailyChallenge: DailyChallengeInfo,
  now = new Date(),
): BetweenStopRouteBadgeKey[] {
  const groups = getRouteDisplayGroupsForRoute(route)
  const badges: BetweenStopRouteBadgeKey[] = []

  if (groups.includes('seasonal') && !isSeasonalRouteUnlocked(route, now)) {
    badges.push('seasonal')
  }

  if (groups.includes('daily') && !isTodaysDailyChallengeRoute(route, dailyChallenge)) {
    badges.push('daily')
  }

  const inTripPool =
    groups.includes('normal') ||
    (groups.includes('daily') && isTodaysDailyChallengeRoute(route, dailyChallenge)) ||
    (groups.includes('seasonal') && isSeasonalRouteUnlocked(route, now))

  if (!inTripPool && !badges.includes('seasonal') && !badges.includes('daily')) {
    badges.push('tripPoolExcluded')
  }

  return badges
}
