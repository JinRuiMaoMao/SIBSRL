/**
 * ??????????????????
 * ????????????
 */

export const DAILY_CHALLENGE_ROUTE_NUMBERS = new Set([
  '25Y',
  '77X',
  '240',
  '242',
  '248',
  '270A',
  '476S',
  'Y370',
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
  'F469',
  'N76',
])

export type GameRouteGroup = 'daily' | 'seasonal' | 'normal'

export function getGameRouteGroup(route: {
  id: string
  number: string
}): GameRouteGroup {
  if (
    DAILY_CHALLENGE_ROUTE_NUMBERS.has(route.id) ||
    DAILY_CHALLENGE_ROUTE_NUMBERS.has(route.number)
  ) {
    return 'daily'
  }
  if (
    SEASONAL_LIMITED_ROUTE_NUMBERS.has(route.id) ||
    SEASONAL_LIMITED_ROUTE_NUMBERS.has(route.number)
  ) {
    return 'seasonal'
  }
  return 'normal'
}

