import type { BilingualText, BusRoute } from '../types/route'

/** Toggle order: north before south, west before east. */
const DIRECTION_SORT_ORDER: Record<string, number> = {
  N: 0,
  W: 1,
  E: 2,
  S: 3,
}

export function routeHasDirectionVariants(route: BusRoute): boolean {
  return (route.stops?.length ?? 0) > 1
}

export function getRouteDirectionCount(route: BusRoute): number {
  return route.stops?.length ?? 0
}

function inferDirectionKey(direction: BilingualText): string | null {
  const zh = direction.zh
  const en = direction.en.toLowerCase()
  if (zh.startsWith('南行') || en.includes('southbound')) return 'S'
  if (zh.startsWith('北行') || en.includes('northbound')) return 'N'
  if (zh.startsWith('东行') || en.includes('eastbound')) return 'E'
  if (zh.startsWith('西行') || en.includes('westbound')) return 'W'
  return null
}

export function getDirectionKey(route: BusRoute, dataIndex: number): string | null {
  const group = route.stops?.[dataIndex]
  if (!group) return null
  return group.directionKey ?? inferDirectionKey(group.direction)
}

export function getSortedDirectionDataIndices(route: BusRoute): number[] {
  const count = getRouteDirectionCount(route)
  const indices = Array.from({ length: count }, (_, i) => i)
  if (count <= 1) return indices

  return indices.sort((a, b) => {
    const ka = getDirectionKey(route, a) ?? `~${a}`
    const kb = getDirectionKey(route, b) ?? `~${b}`
    const pa = DIRECTION_SORT_ORDER[ka] ?? 50
    const pb = DIRECTION_SORT_ORDER[kb] ?? 50
    if (pa !== pb) return pa - pb
    return a - b
  })
}

/** UI direction index (sorted) → index in `route.stops`. */
export function getDirectionDataIndex(route: BusRoute, sortedIndex: number): number {
  const sorted = getSortedDirectionDataIndices(route)
  return sorted[sortedIndex] ?? 0
}

export function getSortedDirectionCount(route: BusRoute): number {
  const sorted = getSortedDirectionDataIndices(route)
  if (sorted.length > 0) return sorted.length
  return route.stops?.length ? 1 : 0
}

export function clampDirectionIndex(route: BusRoute, sortedIndex: number): number {
  const count = getSortedDirectionCount(route)
  if (count <= 1) return 0
  return Math.max(0, Math.min(sortedIndex, count - 1))
}
