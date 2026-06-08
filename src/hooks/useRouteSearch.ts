import { useCallback, useMemo, useState } from 'react'
import { routes } from '../data/routes'
import { getGameRouteGroup } from '../data/gameRouteGroups'
import { TYPE_FILTER_ORDER } from '../i18n/routeTypes'
import type { BusRoute, RouteFilters, RouteTypeFilter } from '../types/route'
import { routeMatchesTypeFilter } from '../utils/routeTypes'
import { clampDirectionIndex } from '../utils/routeDirections'
import { compareRouteNumber } from '../utils/routeSort'
import { isRouteStopDataComplete } from '../utils/routeCompleteness'
import { mergeRoutesByBaseNumber } from '../utils/routeMerge'

const defaultFilters: RouteFilters = {
  query: '',
  zone: 'all',
  operator: 'all',
  type: 'all',
  routeGroup: 'all',
}

function matchesQuery(route: BusRoute, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const directionQuery = q.match(/^(.+)([nsew])$/i)
  if (directionQuery) {
    const base = directionQuery[1]!.toLowerCase()
    const dir = directionQuery[2]!.toUpperCase()
    const hasDirection = route.stops?.some((s) => (s.directionKey ?? '').toUpperCase() === dir) ?? false
    if (route.number.toLowerCase() === base && hasDirection) return true
  }

  const haystack = [
    route.number,
    route.origin.zh,
    route.origin.en,
    route.destination.zh,
    route.destination.en,
    route.via?.zh,
    route.via?.en,
    ...route.operators,
    ...route.stops?.flatMap((s) => s.list.flatMap((stop) => [stop.name.zh, stop.name.en])) ?? [],
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(q) || route.number.toLowerCase().startsWith(q)
}

export function useRouteSearch() {
  const [filters, setFilters] = useState<RouteFilters>(defaultFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [directionByRouteId, setDirectionByRouteId] = useState<Record<string, number>>({})

  const displayRoutes = useMemo(() => mergeRoutesByBaseNumber(routes), [])

  const filteredRoutes = useMemo(() => {
    return displayRoutes
      .filter((route) => {
        if (filters.zone !== 'all' && !route.zones.includes(filters.zone)) return false
        if (filters.operator !== 'all' && !route.operators.includes(filters.operator)) return false
        if (filters.type !== 'all' && !routeMatchesTypeFilter(route, filters.type)) return false
        if (filters.routeGroup !== 'all' && getGameRouteGroup(route.number) !== filters.routeGroup)
          return false
        return matchesQuery(route, filters.query)
      })
      .sort((a, b) => compareRouteNumber(a.number, b.number))
  }, [displayRoutes, filters])

  const randomEligibleRoutes = useMemo(
    () => filteredRoutes.filter(isRouteStopDataComplete),
    [filteredRoutes],
  )

  const selectedRoute = useMemo(
    () => displayRoutes.find((r) => r.id === selectedId) ?? null,
    [displayRoutes, selectedId],
  )

  const updateFilter = <K extends keyof RouteFilters>(key: K, value: RouteFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const getDirectionIndex = useCallback(
    (route: BusRoute) => {
      const stored = directionByRouteId[route.id]
      return clampDirectionIndex(route, stored ?? 0)
    },
    [directionByRouteId],
  )

  const setDirectionIndex = useCallback(
    (routeId: string, index: number) => {
      const route = displayRoutes.find((r) => r.id === routeId)
      if (!route) return
      setDirectionByRouteId((prev) => ({
        ...prev,
        [routeId]: clampDirectionIndex(route, index),
      }))
    },
    [displayRoutes],
  )

  const selectRoute = (id: string) => setSelectedId(id)
  const clearSelection = () => setSelectedId(null)

  const selectRandomRoute = useCallback((): string | null => {
    if (randomEligibleRoutes.length === 0) return null
    const pick = randomEligibleRoutes[Math.floor(Math.random() * randomEligibleRoutes.length)]!
    setSelectedId(pick.id)
    return pick.id
  }, [randomEligibleRoutes])

  const zones = useMemo(() => {
    const set = new Set<number>()
    displayRoutes.forEach((r) => r.zones.forEach((z) => set.add(z)))
    return [...set].sort((a, b) => a - b)
  }, [displayRoutes])

  const operators = useMemo(() => {
    const set = new Set<string>()
    displayRoutes.forEach((r) => r.operators.forEach((o) => set.add(o)))
    return [...set].sort()
  }, [displayRoutes])

  const types = useMemo(() => {
    const used = new Set<RouteTypeFilter>()
    displayRoutes.forEach((r) => {
      if (r.category === 'centralAxis') used.add('centralAxis')
      r.serviceTypes?.forEach((t) => used.add(t))
    })
    return TYPE_FILTER_ORDER.filter((t) => used.has(t))
  }, [displayRoutes])

  return {
    filters,
    updateFilter,
    filteredRoutes,
    selectedRoute,
    getDirectionIndex,
    setDirectionIndex,
    selectRoute,
    selectRandomRoute,
    randomEligibleCount: randomEligibleRoutes.length,
    clearSelection,
    zones,
    operators,
    types,
    totalCount: displayRoutes.length,
  }
}
