import {
  formatSeasonalAvailabilityRangeInGame,
  getSeasonalRouteDisplayWindow,
  getSeasonalAvailabilityLabels,
} from '../data/seasonalRouteAvailability'
import {
  formatShiftUnlockPrerequisitesForLockedCard,
  getShiftUnlockPrerequisites,
  lockedCardDisplayNumber,
} from '../data/routeShiftUnlocks'
import { routeUsesSunshardUnlock } from '../data/routeUnlocks'
import type { MessageKey } from '../i18n/messages'
import type { Locale } from '../i18n/types'
import type { BusRoute } from '../types/route'

export interface LockedRouteCardDisplayProps {
  displayNumber?: string
  availabilityRangeLabel?: string
  availabilityUnavailableLabel?: string
}

export function getLockedRouteCardDisplayProps(
  route: BusRoute,
  directionIndex: number,
  listedId: string | undefined,
  locale: Locale,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): LockedRouteCardDisplayProps {
  const directionKey = route.stops?.[directionIndex]?.directionKey
  const resolvedNumber =
    lockedCardDisplayNumber(route, listedId, directionKey) ?? route.number
  const displayNumber =
    listedId && listedId !== route.number && listedId !== route.id
      ? listedId
      : resolvedNumber !== route.number
        ? resolvedNumber
        : undefined

  const seasonalWindow = getSeasonalRouteDisplayWindow(route)
  const seasonalLabels = seasonalWindow
    ? getSeasonalAvailabilityLabels(seasonalWindow, locale, t)
    : null
  const seasonalRange =
    seasonalLabels?.range ??
    (seasonalWindow ? formatSeasonalAvailabilityRangeInGame(seasonalWindow, locale) : undefined)

  const shiftUnlock = getShiftUnlockPrerequisites(route, { listedId, directionIndex })
  const shiftUnlockLabel = shiftUnlock
    ? formatShiftUnlockPrerequisitesForLockedCard(route, { listedId, directionIndex })
    : null

  const usesSunshardUnlock = routeUsesSunshardUnlock(route)
  const sunshardLabel =
    usesSunshardUnlock && route.sunshardsRequired != null && shiftUnlock == null
      ? t('routeLockedGameUnlockSunshards', { n: route.sunshardsRequired })
      : null

  return {
    displayNumber,
    availabilityRangeLabel: seasonalRange,
    availabilityUnavailableLabel:
      shiftUnlockLabel ?? sunshardLabel ?? seasonalLabels?.unavailableFrom ?? undefined,
  }
}
