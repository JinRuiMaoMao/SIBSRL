import { readRecentRouteIds } from './routeActivity'

export const REAL_START_HAS_OPENED_ROUTES_KEY = 'sibs-real-start-has-opened-routes'

/** Mirrors LevelManager:HasFinishedAnyRoute — proxy via route lookup activity. */
export function readRealStartHasOpenedRoutes(): boolean {
  try {
    if (localStorage.getItem(REAL_START_HAS_OPENED_ROUTES_KEY) === '1') return true
  } catch {
    /* ignore */
  }
  return readRecentRouteIds().length > 0
}

export function markRealStartHasOpenedRoutes(): void {
  try {
    localStorage.setItem(REAL_START_HAS_OPENED_ROUTES_KEY, '1')
  } catch {
    /* ignore */
  }
}
