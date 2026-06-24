import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  dailyChallengeMatchesFilters,
  getTodaysDailyChallenge,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import { routes } from '../data/routes'
import { TYPE_FILTER_ORDER } from '../i18n/routeTypes'
import {
  readStoredRouteFilters,
  writeStoredRouteFilters,
} from '../storage/routePreferences'
import type { BusRoute, RouteFilters, RouteTypeFilter } from '../types/route'
import { routeMatchesFilters } from '../utils/routeFilterMatch'
import { clampDirectionIndex } from '../utils/routeDirections'
import { compareRouteNumber } from '../utils/routeSort'
import { buildRandomEligibleRoutes } from '../utils/randomRoutePool'
import {
  mergeRoutesByBaseNumber,
  findDisplayRouteByQuery,
} from '../utils/routeMerge'

const defaultFilters: RouteFilters = {
  query: '',
  ...readStoredRouteFilters(),
}

export function useRouteSearch(dailyChallenge: DailyChallengeInfo = getTodaysDailyChallenge()) {
  const [filters, setFilters] = useState<RouteFilters>(defaultFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [directionByRouteId, setDirectionByRouteId] = useState<Record<string, number>>({})
  const [loopViewByRouteId, setLoopViewByRouteId] = useState<Record<string, boolean>>({})

  const displayRoutes = useMemo(() => mergeRoutesByBaseNumber(routes), [])

  const filteredRoutes = useMemo(() => {
    return displayRoutes
      .filter((route) => routeMatchesFilters(route, filters))
      .sort((a, b) => compareRouteNumber(a.number, b.number))
  }, [displayRoutes, filters])

  useEffect(() => {
    writeStoredRouteFilters({
      zone: filters.zone,
      operator: filters.operator,
      type: filters.type,
    })
  }, [filters.zone, filters.operator, filters.type])

  const dailyChallengeVisible = useMemo(
    () => dailyChallengeMatchesFilters(dailyChallenge, filters),
    [dailyChallenge, filters],
  )

  const randomEligibleRoutes = useMemo(
    () => buildRandomEligibleRoutes(filteredRoutes, dailyChallenge),
    [dailyChallenge, filteredRoutes],
  )

  const selectedRoute = useMemo(() => {
    if (!selectedId) return null
    return displayRoutes.find((r) => r.id === selectedId) ?? null
  }, [displayRoutes, selectedId])

  const updateFilter = useCallback(
    <K extends keyof RouteFilters>(key: K, value: RouteFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

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

  /** 列表卡片方向：用户切换后尊重选择；否则固定使用排序后最左侧方向（北 / 西）。 */
  const getCardDirectionIndex = useCallback(
    (route: BusRoute, _listedDirectionKey?: 'N' | 'S' | 'E' | 'W' | null) => {
      if (directionByRouteId[route.id] !== undefined) {
        return clampDirectionIndex(route, directionByRouteId[route.id]!)
      }
      return clampDirectionIndex(route, 0)
    },
    [directionByRouteId],
  )

  const getLoopView = useCallback(
    (route: BusRoute) => loopViewByRouteId[route.id] ?? false,
    [loopViewByRouteId],
  )

  const setLoopView = useCallback((routeId: string, loopView: boolean) => {
    setLoopViewByRouteId((prev) => ({
      ...prev,
      [routeId]: loopView,
    }))
  }, [])

  const selectRoute = useCallback(
    (id: string) => {
      const route = findDisplayRouteByQuery(displayRoutes, id)
      setSelectedId(route?.id ?? id.trim())
    },
    [displayRoutes],
  )
  const clearSelection = useCallback(() => setSelectedId(null), [])

  const findDisplayRoute = useCallback(
    (id: string) => findDisplayRouteByQuery(displayRoutes, id) ?? null,
    [displayRoutes],
  )

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
    displayRoutes,
    dailyChallengeVisible,
    selectedRoute,
    getDirectionIndex,
    getCardDirectionIndex,
    setDirectionIndex,
    getLoopView,
    setLoopView,
    selectRoute,
    selectRandomRoute,
    randomEligibleCount: randomEligibleRoutes.length,
    clearSelection,
    findDisplayRoute,
    zones,
    operators,
    types,
    totalCount: displayRoutes.length,
  }
}
