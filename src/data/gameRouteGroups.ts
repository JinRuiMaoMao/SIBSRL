/**
 * ??????????????????
 * ????????????
 */

export const DAILY_CHALLENGE_ROUTE_NUMBERS = new Set([
  '25Y',
  '77XA',
  '240A',
  '242A',
  '248A',
  '370AEM',
  'Y370A',
  '471',
  '473A',
  'N146A',
  'N271',
  'R148',
  'R370',
])

export const SEASONAL_LIMITED_ROUTE_NUMBERS = new Set([
  '73S',
  '76S',
  '376S',
  '476SA',
  'F469A',
  'N76A',
])

export type GameRouteGroup = 'daily' | 'seasonal' | 'normal'

export function getGameRouteGroup(routeNumber: string): GameRouteGroup {
  if (DAILY_CHALLENGE_ROUTE_NUMBERS.has(routeNumber)) return 'daily'
  if (SEASONAL_LIMITED_ROUTE_NUMBERS.has(routeNumber)) return 'seasonal'
  return 'normal'
}

