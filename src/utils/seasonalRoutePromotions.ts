import {
  getGroupDisplaySlots,
  getRouteDisplayGroupsForRoute,
} from '../data/routeDisplayGroups'
import {
  getSeasonalRouteActiveWindow,
  shouldPromoteSeasonalRouteBelowDailyChallenge,
  type SeasonalAvailabilityWindow,
} from '../data/seasonalRouteAvailability'
import type { BusRoute } from '../types/route'
import { directionIndexForLockedSlot } from './lockedUnlockCategories'
import { compareRouteNumber } from './routeSort'

export interface SeasonalPromotionEntry {
  route: BusRoute
  listedId: string
  directionIndex: number
  window: SeasonalAvailabilityWindow
}

/** 季节限定活动已到开放期（HKT 游戏日）→ 在每日挑战下方展示推广卡。 */
export function isRouteSeasonalPromotedBelowDailyChallenge(
  route: BusRoute,
  now = new Date(),
): boolean {
  if (!getRouteDisplayGroupsForRoute(route).includes('seasonal')) return false
  return shouldPromoteSeasonalRouteBelowDailyChallenge(route, now)
}

export function collectSeasonalPromotionsBelowDailyChallenge(
  routes: readonly BusRoute[],
  now = new Date(),
): SeasonalPromotionEntry[] {
  const promotions: SeasonalPromotionEntry[] = []
  const seenRouteIds = new Set<string>()

  for (const slot of getGroupDisplaySlots('seasonal', routes)) {
    if (!slot.entry) continue
    const { route, listedId, directionKey } = slot.entry
    if (seenRouteIds.has(route.id)) continue

    if (!shouldPromoteSeasonalRouteBelowDailyChallenge(route, now)) continue
    const window = getSeasonalRouteActiveWindow(route, now)
    if (!window) continue

    seenRouteIds.add(route.id)
    promotions.push({
      route,
      listedId,
      directionIndex: directionIndexForLockedSlot(route, directionKey),
      window,
    })
  }

  promotions.sort((a, b) => compareRouteNumber(a.listedId, b.listedId))
  return promotions
}
