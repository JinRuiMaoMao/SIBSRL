import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  DAILY_CHALLENGE_CARD_ID,
  buildDailyChallengeFromScheduleDay,
  findRouteForDailyChallenge,
  findDailyChallengeDirectionIndex,
  getDailyChallengeListedRouteId,
  isPrivateHireChallengeRoute,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import type { DailyChallengeScheduleDay } from '../data/dailyChallengeSchedule'
import {
  countVisibleMergedSlots,
  filterLockedSectionDisplaySlots,
  filterRoutesForMainRouteList,
  getGroupDisplaySlots,
  getRouteDisplayGroupsForRoute,
  mergeGroupDisplaySlots,
  mergeLevelOnlySpecialIntoNormalSlots,
  ROUTE_DISPLAY_GROUP_ORDER,
  ROUTE_LIST_UI_SECTION_GROUPS,
  ROUTE_LIST_UI_SECTION_ORDER,
  type RouteDisplayGroupKey,
  type RouteListUiSectionKey,
} from '../data/routeDisplayGroups'
import {
  getShiftUnlockLockedDisplaySlots,
  getShiftUnlockLockedRouteIds,
  mergeShiftUnlockLockedDisplaySlots,
  routeBelongsToShiftUnlockCategory,
} from '../data/routeShiftUnlocks'
import {
  getSunshardUnlockLockedDisplaySlots,
  getSunshardUnlockLockedRouteIds,
  mergeSunshardUnlockLockedDisplaySlots,
} from '../data/routeSunshardUnlocks'
import { sortLockedDisplaySlots } from '../utils/lockedRouteDisplayOrder'
import { routeUsesSunshardUnlock } from '../data/routeUnlocks'
import {
  getSeasonalAvailabilityLabels,
  getSeasonalRouteDisplayWindow,
} from '../data/seasonalRouteAvailability'
import { DailyChallengeBanner } from './DailyChallengeBanner'
import { DailyChallengeCalendarDialog } from './DailyChallengeCalendarDialog'
import { FavoritesFolderBar } from './FavoritesFolderBar'
import { DailyChallengeDetail } from './DailyChallengeDetail'
import { RouteNotFoundDetail } from './RouteNotFoundDetail'
import { RouteCard } from './RouteCard'
import { RouteLockedGameCard } from './RouteLockedGameCard'
import { RouteDetail } from './RouteDetail'
import { RouteDetailRealPanel } from './RouteDetailRealPanel'
import { RouteGroupCollapse } from './RouteGroupCollapse'
import { RouteListGameSection } from './RouteListGameSection'
import { RouteListViewAllFooter } from './RouteListViewAllFooter'
import { RouteUnlockCategoryList } from './RouteUnlockCategoryList'
import type { RouteUnlockCategoryKind } from './RouteUnlockCategoryCard'
import { RouteSearchSyntaxDock } from './RouteSearchSyntaxDock'
import { SearchSyntaxHelp } from './SearchSyntaxHelp'
import { SearchToolbar } from './SearchToolbar'
import { WIDE_LAYOUT_MEDIA } from '../constants/layout'
import { isRealLayoutMode } from '../utils/appLayoutMode'
import { IslandMapEmbeddedPane } from './IslandMapEmbeddedPane'
import { RouteLookupSplitList } from './RouteLookupSplitList'
import { RealRouteLookupMusic } from './RealRouteLookupMusic'
import { RealRouteSplitHeader } from './RealRouteSplitHeader'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useRouteLookupStickyFade } from '../hooks/useRouteLookupStickyFade'
import { isSearchSyntaxAtScrollTop, SEARCH_SYNTAX_EXPAND_ARM_PX, SEARCH_SYNTAX_EXPAND_TOP_PX, useSearchSyntaxScrollHide } from '../hooks/useSearchSyntaxScrollHide'
import { useRouteSearch } from '../hooks/useRouteSearch'
import { useStickyLayoutOffsets } from '../hooks/useStickyLayoutOffsets'
import { getPrimaryText } from '../i18n/displayText'
import { useGuidedTourControl } from '../contexts/GuidedTourContext'
import { useIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { useLocale } from '../i18n/LocaleContext'
import { resolveRouteMapOverlaySource, resolveImportedRouteMapDisplay, loadGeneralMapImageSize } from '../utils/routeMapOverlaySource'
import { buildRouteDetailMapStops } from '../utils/routeDetailMapStops'
import { isChineseLocale } from '../i18n/types'
import type { BusRoute, RouteTypeFilter } from '../types/route'
import type { RoutePageData } from '../types/routePageData'
import { loadRoutePageData } from '../utils/loadRoutePageData'
import { resolveActiveStopGroup } from '../utils/routeLoopView'
import { loadWorldMapStopCatalog } from '../utils/worldMapStopCatalog'
import { lockPageScroll } from '../utils/pageScrollLock'
import {
  defaultClosedRouteGroups,
  readStoredRouteGroupOpen,
  writeStoredRouteGroupOpen,
} from '../storage/routePreferences'
import { useFavoriteRoutes } from '../contexts/FavoriteRoutesContext'
import { useRecentRoutes } from '../contexts/RecentRoutesContext'
import { useRouteListKeyboard } from '../hooks/useRouteListKeyboard'
import {
  clearSearchHistory,
  pushSearchHistory,
  readSearchHistory,
} from '../storage/routeActivity'
import { shouldReduceMotion } from '../storage/appPreferences'
import { canAutoStartGuidedTour, getGuidedTourAutoStartDelayMs } from '../storage/guidedTour'
import {
  buildStopPairSearchQuery,
  clearRouteFromLocation,
  clearSearchFromLocation,
  clearStopPairFromLocation,
  readDirectionQueryFromLocation,
  readRouteQueryFromLocation,
  readSearchQueryFromLocation,
  readStopPairFromLocation,
  replaceRouteInLocation,
  replaceSearchInLocation,
  replaceStopPairInLocation,
  setRouteInLocation,
} from '../utils/routeNavigation'
import { scheduleRoutePagePrefetch } from '../utils/routePagePrefetch'
import { routeMatchesFilters } from '../utils/routeFilterMatch'
import { isRouteStopDataComplete } from '../utils/routeCompleteness'
import {
  findStopsMatchingQuery,
  routePassesStopQuery,
} from '../utils/routeStopLookup'
import {
  findDirectRoutesBetweenStops,
  resolveStopByQuery,
} from '../utils/routeBetweenStops'
import { isDirectRouteBetweenStopsFeasible, parseDepartureTimeInput, type TimetableFeasibilityOptions } from '../utils/routeTimetableFeasibility'
import { getSortedDirectionIndexFromDataIndex } from '../utils/routeDirections'
import {
  buildRealRouteListEntries,
  buildRealRouteListEntriesFromDisplaySlots,
  formatRealRouteDisplayNumber,
  realRouteListKey,
} from '../utils/realRouteListEntries'
import {
  findTransferPlansBetweenStops,
  formatTransferPlanRouteChain,
  type TransferPlan,
  type TransferPlanSortMode,
} from '../utils/stopTransferPlans'
import { findWalkTransferPlans, mergeTransferAndWalkPlans } from '../utils/walkTransferPlans'
import { BetweenStopsResults } from './BetweenStopsResults'
import { TransferPlanDetail } from './TransferPlanDetail'
import {
  getFilterChipView,
  parseStructuredSearchQuery,
  stripOperatorTokens,
  stripTypeFilterTokens,
  stripZoneTokens,
} from '../utils/structuredSearchQuery'
import type { MatchedStop } from '../utils/routeStopLookup'

type DetailOverlay =
  | { kind: 'route'; route: BusRoute }
  | { kind: 'daily-challenge'; challenge: DailyChallengeInfo }
  | { kind: 'transfer-plan'; plan: TransferPlan; planIndex: number; from: MatchedStop; to: MatchedStop }
  | { kind: 'not-found'; routeId: string }
  | null

function overlayKey(overlay: DetailOverlay): string | null {
  if (!overlay) return null
  if (overlay.kind === 'route') return overlay.route.id
  if (overlay.kind === 'not-found') return `not-found-${overlay.routeId}`
  if (overlay.kind === 'transfer-plan') {
    return `transfer-plan-${overlay.planIndex}-${formatTransferPlanRouteChain(overlay.plan)}`
  }
  return `daily-challenge-${overlay.challenge.date}`
}

/** 详情全屏滑入/滑出时长（毫秒） */
const DETAIL_ANIM_MS = 500
const DETAIL_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'


function motionDurationMs(): number {
  return shouldReduceMotion() ? 200 : DETAIL_ANIM_MS
}

function scrollRouteCardIntoView(routeId: string) {
  const el = document.querySelector<HTMLElement>(
    `[data-route-id="${CSS.escape(routeId)}"]`,
  )
  if (!el) return
  el.scrollIntoView({ behavior: shouldReduceMotion() ? 'auto' : 'smooth', block: 'center' })
}

function scrollRealRouteCardIntoView(listKey: string) {
  const el = document.querySelector<HTMLElement>(
    `[data-real-list-key="${CSS.escape(listKey)}"]`,
  )
  if (!el) return
  el.scrollIntoView({ behavior: shouldReduceMotion() ? 'auto' : 'smooth', block: 'center' })
}

function scrollElementBelowStickyToolbar(el: HTMLElement) {
  const root = document.documentElement
  const header =
    Number.parseFloat(getComputedStyle(root).getPropertyValue('--site-header-sticky-offset')) || 0
  const toolbar =
    Number.parseFloat(getComputedStyle(root).getPropertyValue('--route-toolbar-height')) || 0
  const top = el.getBoundingClientRect().top + window.scrollY - header - toolbar - 12
  window.scrollTo({
    top: Math.max(0, top),
    behavior: shouldReduceMotion() ? 'auto' : 'smooth',
  })
}

function runDetailAnimation(
  el: HTMLElement,
  keyframes: Keyframe[],
  options: Omit<KeyframeAnimationOptions, 'duration'> & { duration?: number },
): Animation {
  return el.animate(keyframes, {
    ...options,
    duration: options.duration ?? motionDurationMs(),
    fill: 'forwards',
  })
}

interface RouteLookupPageProps {
  pendingDailyChallengeDetail?: number
  onPendingDailyChallengeDetailConsumed?: () => void
  dailyChallenge: DailyChallengeInfo
}

export function RouteLookupPage({
  pendingDailyChallengeDetail = 0,
  onPendingDailyChallengeDetailConsumed,
  dailyChallenge,
}: RouteLookupPageProps) {
  const { t, locale } = useLocale()
  const splitLayoutActive = isRealLayoutMode()
  const { setRouteOverlay } = useIslandMapOverlay()
  const { openTour, registerAutoStartTimer, cancelAutoStartTimer } = useGuidedTourControl()
  const isWideLayout = useMediaQuery(WIDE_LAYOUT_MEDIA)
  useStickyLayoutOffsets()
  const [detailOverlay, setDetailOverlay] = useState<DetailOverlay>(null)
  const [detailClosing, setDetailClosing] = useState(false)
  const [dailyChallengeRouteContext, setDailyChallengeRouteContext] =
    useState<DailyChallengeInfo | null>(null)
  const [dailyChallengeCalendarOpen, setDailyChallengeCalendarOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(readStoredRouteGroupOpen)
  const [unlockCategoryFocus, setUnlockCategoryFocus] = useState<RouteUnlockCategoryKind | null>(
    null,
  )
  const [searchHistory, setSearchHistory] = useState(readSearchHistory)
  const [stopSectionOpen, setStopSectionOpen] = useState(true)
  const [betweenStopsSectionOpen, setBetweenStopsSectionOpen] = useState(true)
  /** 两站 `起点--终点` 仅在 Enter / 历史记录选中后执行搜索，避免输入时主线程卡死 */
  const [committedStopPairQuery, setCommittedStopPairQuery] = useState('')
  const [betweenStopsDepartTime, setBetweenStopsDepartTime] = useState('')
  const [betweenStopsSortMode, setBetweenStopsSortMode] = useState<TransferPlanSortMode>('transfers')
  const stopPairFromUrlRef = useRef(false)
  const betweenStopsSectionRef = useRef<HTMLDivElement>(null)
  const lockedSectionRef = useRef<HTMLDivElement>(null)
  const pendingBetweenStopsScrollRef = useRef(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const stickyToolbarRef = useRef<HTMLDivElement>(null)
  const syntaxPanelRef = useRef<HTMLDivElement>(null)
  const [syntaxManualHidden, setSyntaxManualHidden] = useState(false)
  const syntaxManualHiddenRef = useRef(false)
  const manualHideCanUnlockAtTopRef = useRef(false)

  const clearManualSyntaxHide = useCallback(() => {
    syntaxManualHiddenRef.current = false
    manualHideCanUnlockAtTopRef.current = false
    setSyntaxManualHidden(false)
  }, [])

  const tryUnlockManualSyntaxHideAtTop = useCallback(() => {
    if (!syntaxManualHiddenRef.current || !manualHideCanUnlockAtTopRef.current) return
    clearManualSyntaxHide()
  }, [clearManualSyntaxHide])
  const [routePageDetail, setRoutePageDetail] = useState<{
    route: BusRoute
    pageData: RoutePageData | null
  } | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLButtonElement>(null)
  const openAnimsRef = useRef<Animation[]>([])
  const closeAnimsRef = useRef<Animation[]>([])
  const animGenerationRef = useRef(0)
  const lastPendingDailyChallengeDetailRef = useRef(0)
  const handleSelectDailyChallengeRef = useRef<() => void>(() => {})

  const {
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
    randomEligibleCount,
    clearSelection,
    findDisplayRoute,
    zones,
    operators,
    types,
  } = useRouteSearch(dailyChallenge)
  const selectedRealListKey = useMemo(() => {
    if (!splitLayoutActive || !selectedRoute) return null
    return realRouteListKey(selectedRoute.id, getDirectionIndex(selectedRoute))
  }, [getDirectionIndex, selectedRoute, splitLayoutActive])
  const stickyToolbarFade = useRouteLookupStickyFade(stickyToolbarRef)
  const { scrollHidden: syntaxScrollHidden, forceOpen: syntaxForceOpen, clearScrollHidden: clearSyntaxScrollHidden, releaseForceOpen: releaseSyntaxForceOpen } =
    useSearchSyntaxScrollHide(stickyToolbarRef, syntaxPanelRef, {
      onReturnToTop: tryUnlockManualSyntaxHideAtTop,
    })
  const syntaxInFlowVisible = !syntaxScrollHidden && !syntaxManualHidden && !syntaxForceOpen
  const syntaxExpanded = syntaxForceOpen || (!syntaxScrollHidden && !syntaxManualHidden)

  const handleSyntaxToggle = () => {
    if (!syntaxExpanded) {
      const atTop = isSearchSyntaxAtScrollTop()
      if (syntaxScrollHidden) {
        if (atTop) {
          clearSyntaxScrollHidden()
          clearManualSyntaxHide()
        } else {
          clearSyntaxScrollHidden({ forceOpen: true })
        }
      } else {
        clearManualSyntaxHide()
        if (atTop) clearSyntaxScrollHidden()
      }
      return
    }
    if (syntaxForceOpen) {
      releaseSyntaxForceOpen()
    }
    syntaxManualHiddenRef.current = true
    manualHideCanUnlockAtTopRef.current =
      (window.scrollY || document.documentElement.scrollTop || 0) > SEARCH_SYNTAX_EXPAND_ARM_PX
    setSyntaxManualHidden(true)
  }

  useEffect(() => {
    const syncManualHideUnlock = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0
      if (syntaxManualHiddenRef.current && scrollY > SEARCH_SYNTAX_EXPAND_ARM_PX) {
        manualHideCanUnlockAtTopRef.current = true
      }
      if (
        syntaxManualHiddenRef.current &&
        scrollY <= SEARCH_SYNTAX_EXPAND_TOP_PX &&
        manualHideCanUnlockAtTopRef.current
      ) {
        clearManualSyntaxHide()
        clearSyntaxScrollHidden()
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY >= 0) return
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0
      if (scrollY > SEARCH_SYNTAX_EXPAND_TOP_PX) return
      if (!syntaxManualHiddenRef.current) return
      clearManualSyntaxHide()
      clearSyntaxScrollHidden()
    }

    syncManualHideUnlock()
    window.addEventListener('scroll', syncManualHideUnlock, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('scroll', syncManualHideUnlock)
      window.removeEventListener('wheel', onWheel)
    }
  }, [clearManualSyntaxHide, clearSyntaxScrollHidden])
  const { favorites, reorderFavorites, folders } = useFavoriteRoutes()
  const { recentIds, recordRecent } = useRecentRoutes()
  const [draggingFavoriteId, setDraggingFavoriteId] = useState<string | null>(null)

  useEffect(() => {
    scheduleRoutePagePrefetch(displayRoutes.map((route) => route.id))
  }, [displayRoutes])

  const favoriteRoutes = useMemo(() => {
    const byId = new Map(displayRoutes.map((route) => [route.id, route]))
    return favorites
      .map((id) => byId.get(id))
      .filter((route): route is BusRoute => route != null)
  }, [displayRoutes, favorites])

  const showFavoritesSection = useMemo(
    () => folders.some((folder) => folder.routeIds.length > 0) || folders.length > 1,
    [folders],
  )

  const recentRoutes = useMemo(() => {
    const byId = new Map(displayRoutes.map((route) => [route.id, route]))
    return recentIds
      .map((id) => byId.get(id))
      .filter((route): route is BusRoute => route != null)
  }, [displayRoutes, recentIds])

  const matchedStops = useMemo(
    () => findStopsMatchingQuery(filters.query),
    [filters.query],
  )

  const structuredStopPair = useMemo(
    () => parseStructuredSearchQuery(filters.query),
    [filters.query],
  )

  const committedStructuredStopPair = useMemo(
    () => parseStructuredSearchQuery(committedStopPairQuery),
    [committedStopPairQuery],
  )

  const stopPairSearchCommitted =
    committedStopPairQuery.length > 0 && filters.query.trim() === committedStopPairQuery

  const betweenStopsTimetableOptions = useMemo((): TimetableFeasibilityOptions => {
    const departureMinutes = parseDepartureTimeInput(betweenStopsDepartTime)
    return departureMinutes != null ? { departureMinutes } : {}
  }, [betweenStopsDepartTime])

  const betweenStopLookup = useMemo(() => {
    if (!stopPairSearchCommitted) return null

    const fromQuery = committedStructuredStopPair.from?.trim()
    const toQuery = committedStructuredStopPair.to?.trim()
    if (!fromQuery || !toQuery) return null

    const from = resolveStopByQuery(fromQuery)
    const to = resolveStopByQuery(toQuery)
    const betweenStopRouteFilter = (route: BusRoute) =>
      isRouteStopDataComplete(route) && routeMatchesFilters(route, filters)
    const routes =
      from && to
        ? findDirectRoutesBetweenStops(from, to, displayRoutes).filter(
            ({ route, directionIndex }) =>
              betweenStopRouteFilter(route) &&
              isDirectRouteBetweenStopsFeasible(from, to, route, directionIndex, betweenStopsTimetableOptions),
          )
        : []
    const transferPlans =
      from && to
        ? mergeTransferAndWalkPlans(
            findTransferPlansBetweenStops(from, to, displayRoutes, betweenStopRouteFilter, {
              timetable: betweenStopsTimetableOptions,
            }),
            findWalkTransferPlans(from, to, displayRoutes, betweenStopRouteFilter, {
              timetable: betweenStopsTimetableOptions,
            }),
          )
        : []

    return { from, to, fromQuery, toQuery, routes, transferPlans }
  }, [
    betweenStopsTimetableOptions,
    committedStructuredStopPair.from,
    committedStructuredStopPair.to,
    displayRoutes,
    filters,
    stopPairSearchCommitted,
  ])

  const stopLookupRoutes = useMemo(() => {
    if (betweenStopLookup) return []
    const q = filters.query.trim()
    if (q.length < 2 || matchedStops.length === 0) return []
    return displayRoutes
      .filter(
        (route) =>
          routePassesStopQuery(route, q) && routeMatchesFilters(route, filters),
      )
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
  }, [betweenStopLookup, displayRoutes, filters, matchedStops.length])

  useEffect(() => {
    if (stopLookupRoutes.length > 0) setStopSectionOpen(true)
  }, [filters.query, stopLookupRoutes.length])

  useEffect(() => {
    if (
      betweenStopLookup &&
      (betweenStopLookup.routes.length > 0 || betweenStopLookup.transferPlans.length > 0)
    ) {
      setBetweenStopsSectionOpen(true)
    }
  }, [betweenStopLookup])

  useEffect(() => {
    if (stopPairFromUrlRef.current) return
    const pair = readStopPairFromLocation()
    if (pair) {
      stopPairFromUrlRef.current = true
      const query = buildStopPairSearchQuery(pair.from, pair.to)
      updateFilter('query', query)
      setCommittedStopPairQuery(query)
      if (pair.depart) setBetweenStopsDepartTime(pair.depart)
      setBetweenStopsSectionOpen(true)
      pendingBetweenStopsScrollRef.current = true
      return
    }

    const searchQuery = readSearchQueryFromLocation()
    if (searchQuery) updateFilter('query', searchQuery)
    // 仅挂载时从 URL 恢复搜索词；勿依赖 updateFilter，否则每次输入都会把 ?q= 写回输入框
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!stopPairSearchCommitted || !betweenStopLookup) return
    if (!pendingBetweenStopsScrollRef.current) return
    pendingBetweenStopsScrollRef.current = false
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = betweenStopsSectionRef.current
        if (el) scrollElementBelowStickyToolbar(el)
      })
    })
  }, [betweenStopLookup, stopPairSearchCommitted])

  useEffect(() => {
    if (!stopPairSearchCommitted || !betweenStopLookup?.from || !betweenStopLookup?.to) return
    replaceStopPairInLocation(
      betweenStopLookup.fromQuery,
      betweenStopLookup.toQuery,
      betweenStopsDepartTime || null,
    )
  }, [
    betweenStopLookup?.from,
    betweenStopLookup?.fromQuery,
    betweenStopLookup?.to,
    betweenStopLookup?.toQuery,
    betweenStopsDepartTime,
    stopPairSearchCommitted,
  ])

  useEffect(() => {
    writeStoredRouteGroupOpen(groupOpen)
  }, [groupOpen])

  const activeOverlayKey = overlayKey(detailOverlay)

  const cancelAnimations = (list: Animation[]) => {
    for (const anim of list) {
      anim.cancel()
    }
    list.length = 0
  }

  const finishDetailClose = useCallback(() => {
    cancelAnimations(openAnimsRef.current)
    cancelAnimations(closeAnimsRef.current)
    setDetailClosing(false)
    setDetailOverlay(null)
    setRoutePageDetail(null)
    setDailyChallengeRouteContext(null)
    clearSelection()
    clearRouteFromLocation()
  }, [clearSelection])

  const closeSplitDetail = useCallback(() => {
    setDetailClosing(false)
    setDetailOverlay(null)
    setRoutePageDetail(null)
    setDailyChallengeRouteContext(null)
  }, [])

  const detailChromeHidden =
    Boolean(detailOverlay) && !detailClosing && !splitLayoutActive
  const splitMapDetailOpen = splitLayoutActive && Boolean(detailOverlay) && !detailClosing

  useEffect(() => {
    if (detailOverlay?.kind !== 'route') return

    const mode = 'route-detail' as const
    if (!canAutoStartGuidedTour(mode)) return

    const timer = window.setTimeout(() => {
      if (!canAutoStartGuidedTour(mode)) return
      if (!document.querySelector('.route-detail-sheet.is-open .route-detail')) return
      openTour({ mode })
    }, getGuidedTourAutoStartDelayMs(mode))

    registerAutoStartTimer(timer)
    return () => cancelAutoStartTimer()
  }, [detailOverlay?.kind, cancelAutoStartTimer, openTour, registerAutoStartTimer])

  useEffect(() => {
    if (detailOverlay?.kind !== 'route') {
      setRoutePageDetail(null)
      return
    }

    const base = detailOverlay.route
    let cancelled = false

    void loadRoutePageData(base).then((loaded) => {
      if (cancelled) return
      setRoutePageDetail({
        route: loaded?.route ?? base,
        pageData: loaded?.pageData ?? null,
      })
    })

    return () => {
      cancelled = true
    }
  }, [detailOverlay])

  const overlayRoute =
    detailOverlay?.kind === 'route'
      ? detailOverlay.route
      : splitLayoutActive
        ? selectedRoute
        : null
  const overlayDirectionIndex = overlayRoute ? getDirectionIndex(overlayRoute) : null

  useEffect(() => {
    if (!overlayRoute || overlayDirectionIndex == null) {
      setRouteOverlay(null)
      return
    }

    let cancelled = false
    const routeForStops =
      routePageDetail?.route.id === overlayRoute.id ? routePageDetail.route : overlayRoute
    const loopView = getLoopView(routeForStops)
    const activeGroup = resolveActiveStopGroup(routeForStops, overlayDirectionIndex, loopView)

    void (async () => {
      const catalog = await loadWorldMapStopCatalog()
      if (cancelled) return

      const imageSize = await loadGeneralMapImageSize()
      if (cancelled) return

      const importedDisplay = await resolveImportedRouteMapDisplay(
        overlayRoute.id,
        overlayDirectionIndex,
        overlayRoute.number,
        imageSize,
      )
      if (cancelled) return

      if (importedDisplay) {
        const catalogStops =
          !splitLayoutActive && activeGroup?.list
            ? buildRouteDetailMapStops(activeGroup.list, catalog)
            : []
        setRouteOverlay({
          routeId: overlayRoute.id,
          routeNumber: overlayRoute.number,
          directionIndex: overlayDirectionIndex,
          points: importedDisplay.fitPoints.length >= 2 ? importedDisplay.fitPoints : importedDisplay.points,
          importedPath: importedDisplay,
          ...(catalogStops.length ? { stops: catalogStops } : {}),
        })
        return
      }

      const overlaySource = await resolveRouteMapOverlaySource(overlayRoute.id, overlayDirectionIndex, {
        catalog,
        catalogStops: splitLayoutActive ? undefined : activeGroup?.list,
        imageSize,
      })
      if (cancelled) return

      if (!overlaySource) {
        setRouteOverlay(null)
        return
      }

      setRouteOverlay({
        routeId: overlayRoute.id,
        routeNumber: overlayRoute.number,
        directionIndex: overlayDirectionIndex,
        points: overlaySource.points,
        ...( !splitLayoutActive && overlaySource.stops.length ? { stops: overlaySource.stops } : {}),
      })
    })()

    return () => {
      cancelled = true
      setRouteOverlay(null)
    }
  }, [
    getLoopView,
    overlayDirectionIndex,
    overlayRoute,
    routePageDetail,
    setRouteOverlay,
    splitLayoutActive,
  ])

  useEffect(() => {
    const routeId = readRouteQueryFromLocation()
    if (!routeId) return

    const route = findDisplayRoute(routeId)
    if (route) {
      setDailyChallengeRouteContext(null)
      recordRecent(route.id)
      selectRoute(routeId)
      const directionIndex = readDirectionQueryFromLocation()
      if (directionIndex != null) {
        setDirectionIndex(route.id, directionIndex)
      }
      return
    }

    clearSelection()
    setDetailOverlay({ kind: 'not-found', routeId })
  }, [clearSelection, findDisplayRoute, recordRecent, selectRoute, setDirectionIndex])

  useEffect(() => {
    const syncRouteOverlayFromLocation = () => {
      const routeId = readRouteQueryFromLocation()
      if (routeId) {
        const route = findDisplayRoute(routeId)
        if (route) {
          setDailyChallengeRouteContext(null)
          recordRecent(route.id)
          selectRoute(routeId)
          const directionIndex = readDirectionQueryFromLocation()
          if (directionIndex != null) {
            setDirectionIndex(route.id, directionIndex)
          }
          return
        }
        clearSelection()
        setDetailOverlay({ kind: 'not-found', routeId })
        return
      }

      setDetailOverlay((prev) =>
        prev?.kind === 'route' || prev?.kind === 'not-found' ? null : prev,
      )
      setRoutePageDetail(null)
      setDailyChallengeRouteContext(null)
      clearSelection()
    }

    const onPopState = () => {
      syncRouteOverlayFromLocation()
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [clearSelection, findDisplayRoute, recordRecent, selectRoute, setDirectionIndex])

  useEffect(() => {
    if (!selectedRoute) {
      setDetailOverlay((prev) => (prev?.kind === 'route' ? null : prev))
      return
    }
    setDetailOverlay({ kind: 'route', route: selectedRoute })
  }, [selectedRoute])

  useEffect(() => {
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet || !detailOverlay || splitLayoutActive) return

    const generation = ++animGenerationRef.current
    cancelAnimations(closeAnimsRef.current)

    const fromTransform = isWideLayout
      ? 'translate3d(100%, 0, 0)'
      : 'translate3d(0, 100%, 0)'

    sheet.style.transform = fromTransform
    sheet.style.visibility = 'visible'
    sheet.style.pointerEvents = 'auto'
    if (backdrop) {
      backdrop.style.transition = 'none'
      backdrop.style.opacity = '0'
    }

    const duration = motionDurationMs()
    const anims: Animation[] = []

    if (backdrop) {
      anims.push(
        runDetailAnimation(
          backdrop,
          [{ opacity: 0 }, { opacity: 1 }],
          { duration, easing: 'ease' },
        ),
      )
    }

    anims.push(
      runDetailAnimation(
        sheet,
        [{ transform: fromTransform }, { transform: 'translate3d(0, 0, 0)' }],
        { duration, easing: DETAIL_EASING },
      ),
    )

    openAnimsRef.current = anims

    return () => {
      if (animGenerationRef.current !== generation) return
      cancelAnimations(openAnimsRef.current)
    }
  }, [activeOverlayKey, isWideLayout, splitLayoutActive])

  useEffect(() => {
    if (!detailOverlay || detailClosing || splitLayoutActive) return
    return lockPageScroll()
  }, [detailOverlay, detailClosing, splitLayoutActive])

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('route-detail-open', detailChromeHidden)
    return () => {
      document.documentElement.classList.remove('route-detail-open')
    }
  }, [detailChromeHidden])

  useEffect(() => {
    if (!detailOverlay) {
      setDetailClosing(false)
    }
  }, [detailOverlay])

  const openDailyChallenge = useCallback(
    (challenge: DailyChallengeInfo) => {
      const routeNumber = challenge.routeNumber

      if (routeNumber && !isPrivateHireChallengeRoute(routeNumber)) {
        const route = findRouteForDailyChallenge(routeNumber)
        if (route) {
          const directionIndex = findDailyChallengeDirectionIndex(route, challenge.directionKey)
          if (directionIndex != null) setDirectionIndex(route.id, directionIndex)
          setLoopView(route.id, challenge.loopView ?? false)
          setDailyChallengeRouteContext(challenge)
          selectRoute(route.id)
          return
        }
      }

      setDailyChallengeRouteContext(null)
      clearSelection()
      setDetailOverlay({ kind: 'daily-challenge', challenge })
    },
    [clearSelection, selectRoute, setDirectionIndex, setLoopView],
  )

  const handleSelectDailyChallenge = useCallback(() => {
    openDailyChallenge(dailyChallenge)
  }, [dailyChallenge, openDailyChallenge])

  const handleSelectScheduleDay = useCallback(
    (day: DailyChallengeScheduleDay) => {
      setDailyChallengeCalendarOpen(false)
      openDailyChallenge(buildDailyChallengeFromScheduleDay(day))
    },
    [openDailyChallenge],
  )

  const handleRouteNavigate = useCallback(
    (routeId: string, directionIndexOverride?: number) => {
      const q = filters.query.trim()
      const parsed = parseStructuredSearchQuery(q)
      if (q && (!parsed.from?.trim() || !parsed.to?.trim())) {
        replaceSearchInLocation(q)
      }
      setDailyChallengeRouteContext(null)
      recordRecent(routeId)
      if (directionIndexOverride != null) {
        setDirectionIndex(routeId, directionIndexOverride)
        setLoopView(routeId, false)
      }
      selectRoute(routeId)
      const route = findDisplayRoute(routeId)
      const directionIndex =
        directionIndexOverride ?? (route ? getDirectionIndex(route) : 0)
      setRouteInLocation(routeId, directionIndex)
    },
    [
      filters.query,
      findDisplayRoute,
      getDirectionIndex,
      recordRecent,
      selectRoute,
      setDirectionIndex,
      setLoopView,
    ],
  )

  const handleCarouselSelect = useCallback(
    (routeId: string, directionIndex: number) => {
      handleRouteNavigate(routeId, directionIndex)
      const route = findDisplayRoute(routeId)
      if (route) setDetailOverlay({ kind: 'route', route })
    },
    [findDisplayRoute, handleRouteNavigate],
  )

  const handleOpenDetailInSplit = handleCarouselSelect

  handleSelectDailyChallengeRef.current = handleSelectDailyChallenge

  useEffect(() => {
    if (!pendingDailyChallengeDetail) return
    if (pendingDailyChallengeDetail === lastPendingDailyChallengeDetailRef.current) return
    lastPendingDailyChallengeDetailRef.current = pendingDailyChallengeDetail

    handleSelectDailyChallengeRef.current()
    onPendingDailyChallengeDetailConsumed?.()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRouteCardIntoView(DAILY_CHALLENGE_CARD_ID))
    })
  }, [pendingDailyChallengeDetail, onPendingDailyChallengeDetailConsumed])

  const handleRandomRoute = () => {
    if (splitLayoutActive) {
      if (realFilteredEntries.length === 0) return
      const pick = realFilteredEntries[Math.floor(Math.random() * realFilteredEntries.length)]!
      setDirectionIndex(pick.route.id, pick.directionIndex)
      setLoopView(pick.route.id, false)
      recordRecent(pick.route.id)
      selectRoute(pick.route.id)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollRealRouteCardIntoView(pick.listKey))
      })
      return
    }
    const id = selectRandomRoute()
    if (!id) return
    recordRecent(id)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRouteCardIntoView(id))
    })
  }

  const handleCloseDetail = () => {
    if (!detailOverlay || detailClosing) return
    if (splitLayoutActive) {
      closeSplitDetail()
      return
    }
    setDetailClosing(true)

    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet) {
      finishDetailClose()
      return
    }

    cancelAnimations(openAnimsRef.current)

    const toTransform = isWideLayout
      ? 'translate3d(100%, 0, 0)'
      : 'translate3d(0, 100%, 0)'
    const duration = motionDurationMs()
    const anims: Animation[] = []

    anims.push(
      runDetailAnimation(
        sheet,
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: toTransform }],
        { duration, easing: DETAIL_EASING },
      ),
    )

    if (backdrop) {
      backdrop.style.transition = 'none'
      anims.push(
        runDetailAnimation(backdrop, [{ opacity: 1 }, { opacity: 0 }], {
          duration,
          easing: 'ease',
        }),
      )
    }

    closeAnimsRef.current = anims

    void Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(finishDetailClose)
  }

  const filterChipView = useMemo(
    () => getFilterChipView(filters.query, filters),
    [filters],
  )

  const filtersActive =
    filterChipView.zone !== 'all' ||
    filterChipView.operator !== 'all' ||
    filterChipView.type !== 'all' ||
    filterChipView.excludedZones.length > 0 ||
    filterChipView.excludedOperators.length > 0 ||
    filterChipView.excludedTypes.length > 0

  const handleZoneFilterChange = useCallback(
    (zone: number | 'all') => {
      updateFilter('query', stripZoneTokens(filters.query))
      updateFilter('zone', zone)
    },
    [filters.query, updateFilter],
  )

  const handleOperatorFilterChange = useCallback(
    (operator: string | 'all') => {
      updateFilter('query', stripOperatorTokens(filters.query))
      updateFilter('operator', operator)
    },
    [filters.query, updateFilter],
  )

  const handleTypeFilterChange = useCallback(
    (type: RouteTypeFilter | 'all') => {
      updateFilter('query', stripTypeFilterTokens(filters.query))
      updateFilter('type', type)
    },
    [filters.query, updateFilter],
  )

  const dailyChallengeSelected =
    detailOverlay?.kind === 'daily-challenge' || dailyChallengeRouteContext != null
  const routeDetailProps =
    detailOverlay?.kind === 'route'
      ? (() => {
          const route = routePageDetail?.route ?? detailOverlay.route
          const directionIndex = getDirectionIndex(detailOverlay.route)
          return {
            route,
            pageData: routePageDetail?.pageData ?? null,
            directionIndex,
            loopView: splitLayoutActive ? false : getLoopView(detailOverlay.route),
            onDirectionChange: (index: number) => {
              setDirectionIndex(detailOverlay.route.id, index)
              replaceRouteInLocation(detailOverlay.route.id, index)
            },
            onLoopViewChange: (loopView: boolean) => {
              setLoopView(detailOverlay.route.id, loopView)
            },
            onClose: handleCloseDetail,
            lockDirection: splitLayoutActive || dailyChallengeRouteContext != null,
            directionEndpoints:
              dailyChallengeRouteContext?.loopView
                ? null
                : dailyChallengeRouteContext?.endpoints ?? null,
            dailyChallengeIntro: dailyChallengeRouteContext?.intro ?? null,
            hideStops: splitLayoutActive,
            displayNumber: splitLayoutActive
              ? formatRealRouteDisplayNumber(route, directionIndex, t, locale)
              : undefined,
          }
        })()
      : null

  const renderDetailContent = () => {
    if (routeDetailProps) {
      if (splitLayoutActive) {
        const { hideStops: _hideStops, ...realPanelProps } = routeDetailProps
        return <RouteDetailRealPanel {...realPanelProps} />
      }
      return <RouteDetail {...routeDetailProps} />
    }
    if (!detailOverlay) return null
    if (detailOverlay.kind === 'daily-challenge') {
      return (
        <DailyChallengeDetail challenge={detailOverlay.challenge} onClose={handleCloseDetail} />
      )
    }
    if (detailOverlay.kind === 'transfer-plan') {
      return (
        <TransferPlanDetail
          plan={detailOverlay.plan}
          planIndex={detailOverlay.planIndex}
          from={detailOverlay.from}
          to={detailOverlay.to}
          onClose={handleCloseDetail}
          onOpenLeg={handleOpenTransferLeg}
        />
      )
    }
    if (detailOverlay.kind === 'not-found') {
      return <RouteNotFoundDetail routeId={detailOverlay.routeId} onClose={handleCloseDetail} />
    }
    return null
  }

  const dailyListedId = getDailyChallengeListedRouteId(dailyChallenge)

  const groupedTotalSlots = useMemo(() => {
    const groups = {} as Record<RouteDisplayGroupKey, ReturnType<typeof getGroupDisplaySlots>>
    for (const group of ROUTE_DISPLAY_GROUP_ORDER) {
      groups[group] = getGroupDisplaySlots(
        group,
        displayRoutes,
        group === 'daily' && dailyListedId ? [dailyListedId] : [],
      )
    }
    return groups
  }, [dailyListedId, displayRoutes])

  const groupedSlots = useMemo(() => {
    const groups = {} as Record<RouteDisplayGroupKey, ReturnType<typeof getGroupDisplaySlots>>
    for (const group of ROUTE_DISPLAY_GROUP_ORDER) {
      groups[group] = getGroupDisplaySlots(
        group,
        filteredRoutes,
        group === 'daily' && dailyListedId ? [dailyListedId] : [],
      )
    }
    return groups
  }, [dailyListedId, filteredRoutes])

  const getSeasonalLabelsForRoute = useCallback(
    (route: BusRoute) => {
      const window = getSeasonalRouteDisplayWindow(route)
      if (!window) return null
      return getSeasonalAvailabilityLabels(window, locale, t)
    },
    [locale, t],
  )

  const lockedGameRouteIds = useMemo(() => {
    const ids = getSunshardUnlockLockedRouteIds(displayRoutes)
    for (const routeId of getShiftUnlockLockedRouteIds(displayRoutes)) {
      ids.add(routeId)
    }
    return ids
  }, [displayRoutes])

  const listSectionSlots = useMemo(() => {
    const normal = mergeLevelOnlySpecialIntoNormalSlots(
      groupedSlots.normal.filter(
        (slot) => !slot.entry || !lockedGameRouteIds.has(slot.entry.route.id),
      ),
      filteredRoutes,
    )
    // 锁定区与班次/分方向阳光碎片卡一致：不受 zone/operator/type 筛选影响
    const specialSeasonal = sortLockedDisplaySlots(
      filterLockedSectionDisplaySlots(
        mergeSunshardUnlockLockedDisplaySlots(
          mergeShiftUnlockLockedDisplaySlots(
            mergeGroupDisplaySlots(ROUTE_LIST_UI_SECTION_GROUPS.specialSeasonal, groupedTotalSlots),
            getShiftUnlockLockedDisplaySlots(displayRoutes),
          ),
          getSunshardUnlockLockedDisplaySlots(displayRoutes),
        ),
      ),
    )
    return { normal, specialSeasonal }
  }, [groupedSlots, groupedTotalSlots, displayRoutes, filteredRoutes, lockedGameRouteIds])

  const listSectionTotalSlots = useMemo(() => {
    const normal = mergeLevelOnlySpecialIntoNormalSlots(
      groupedTotalSlots.normal.filter(
        (slot) => !slot.entry || !lockedGameRouteIds.has(slot.entry.route.id),
      ),
      displayRoutes,
    )
    const specialSeasonal = sortLockedDisplaySlots(
      filterLockedSectionDisplaySlots(
        mergeSunshardUnlockLockedDisplaySlots(
          mergeShiftUnlockLockedDisplaySlots(
            mergeGroupDisplaySlots(ROUTE_LIST_UI_SECTION_GROUPS.specialSeasonal, groupedTotalSlots),
            getShiftUnlockLockedDisplaySlots(displayRoutes),
          ),
          getSunshardUnlockLockedDisplaySlots(displayRoutes),
        ),
      ),
    )
    return { normal, specialSeasonal }
  }, [groupedTotalSlots, displayRoutes, lockedGameRouteIds])

  const realNormalEntries = useMemo(
    () =>
      splitLayoutActive
        ? buildRealRouteListEntriesFromDisplaySlots(listSectionSlots.normal)
        : [],
    [listSectionSlots.normal, splitLayoutActive],
  )

  const realLockedEntries = useMemo(
    () =>
      splitLayoutActive
        ? buildRealRouteListEntriesFromDisplaySlots(listSectionSlots.specialSeasonal)
        : [],
    [listSectionSlots.specialSeasonal, splitLayoutActive],
  )

  const realFilteredEntries = useMemo(
    () => (splitLayoutActive ? [...realNormalEntries, ...realLockedEntries] : []),
    [realLockedEntries, realNormalEntries, splitLayoutActive],
  )

  const realTotalEntries = useMemo(() => {
    if (!splitLayoutActive) return []
    return [
      ...buildRealRouteListEntriesFromDisplaySlots(listSectionTotalSlots.normal),
      ...buildRealRouteListEntriesFromDisplaySlots(listSectionTotalSlots.specialSeasonal),
    ]
  }, [listSectionTotalSlots, splitLayoutActive])

  useEffect(() => {
    if (!splitLayoutActive) return
    if (!selectedRoute) return
    const directionIndex = getDirectionIndex(selectedRoute)
    const stillVisible = realFilteredEntries.some(
      (entry) => entry.route.id === selectedRoute.id && entry.directionIndex === directionIndex,
    )
    if (stillVisible) return
    clearSelection()
    clearRouteFromLocation()
    setDetailOverlay((prev) => (prev?.kind === 'route' ? null : prev))
  }, [
    clearSelection,
    getDirectionIndex,
    realFilteredEntries,
    selectedRoute,
    splitLayoutActive,
  ])

  const countVisibleSectionSlots = useCallback(
    (section: RouteListUiSectionKey) =>
      countVisibleMergedSlots(listSectionSlots[section]),
    [listSectionSlots],
  )

  const groupedRouteCount = useMemo(() => {
    return ROUTE_LIST_UI_SECTION_ORDER.reduce(
      (sum, section) => sum + countVisibleMergedSlots(listSectionSlots[section]),
      0,
    )
  }, [listSectionSlots])

  const groupedTotalCount = useMemo(() => {
    return ROUTE_LIST_UI_SECTION_ORDER.reduce(
      (sum, section) => sum + countVisibleMergedSlots(listSectionTotalSlots[section]),
      0,
    )
  }, [listSectionTotalSlots])

  const filteredLockedSlots = useMemo(() => {
    const slots = listSectionSlots.specialSeasonal
    const filtered = !unlockCategoryFocus
      ? slots
      : slots.filter((slot) => {
          if (slot.entry == null) return false
          const { route, listedId, directionKey } = slot.entry
          const directionIndex = directionKey
            ? route.stops?.findIndex((stop) => stop.directionKey === directionKey) ?? 0
            : 0
          if (unlockCategoryFocus === 'shift') {
            return routeBelongsToShiftUnlockCategory(route, { listedId, directionIndex })
          }
          const groups = getRouteDisplayGroupsForRoute(route)
          if (groups.includes(unlockCategoryFocus)) {
            if (
              unlockCategoryFocus === 'special' &&
              routeBelongsToShiftUnlockCategory(route, { listedId, directionIndex })
            ) {
              return false
            }
            return true
          }
          if (unlockCategoryFocus === 'special' && routeUsesSunshardUnlock(route)) {
            return !routeBelongsToShiftUnlockCategory(route, { listedId, directionIndex })
          }
          return false
        })
    return sortLockedDisplaySlots(filtered)
  }, [listSectionSlots.specialSeasonal, unlockCategoryFocus])

  const betweenStopPairDraft =
    Boolean(structuredStopPair.from?.trim() && structuredStopPair.to?.trim()) &&
    !stopPairSearchCommitted

  const listIsEmpty =
    !dailyChallengeVisible &&
    groupedRouteCount === 0 &&
    stopLookupRoutes.length === 0 &&
    !betweenStopLookup &&
    !betweenStopPairDraft

  const handleSearchQueryChange = useCallback(
    (q: string) => {
      updateFilter('query', q)
      setUnlockCategoryFocus(null)
      setGroupOpen(defaultClosedRouteGroups())
      if (!q.trim()) {
        setCommittedStopPairQuery('')
        clearStopPairFromLocation()
        clearSearchFromLocation()
        return
      }

      const urlQuery = readSearchQueryFromLocation()
      if (urlQuery != null && urlQuery !== q.trim()) {
        replaceSearchInLocation(q)
      }
    },
    [updateFilter],
  )

  const handleViewAllPlayable = useCallback(() => {
    updateFilter('query', '')
    updateFilter('zone', 'all')
    updateFilter('operator', 'all')
    updateFilter('type', 'all')
    setCommittedStopPairQuery('')
    setUnlockCategoryFocus(null)
    clearStopPairFromLocation()
    clearSearchFromLocation()
    setGroupOpen((prev) => ({
      ...prev,
      normal: true,
      unlockable: true,
      specialSeasonal: true,
      favorites: true,
      recent: true,
    }))
    setStopSectionOpen(true)
    setBetweenStopsSectionOpen(true)
  }, [updateFilter])

  const handleUnlockCategorySelect = useCallback((kind: RouteUnlockCategoryKind) => {
    setUnlockCategoryFocus((prev) => (prev === kind ? null : kind))
    setGroupOpen((prev) => ({ ...prev, unlockable: true, specialSeasonal: true }))
    requestAnimationFrame(() => {
      lockedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

  const handleSearchCommit = useCallback(() => {
    const q = filters.query.trim()
    if (!q) return

    setSearchHistory((prev) => pushSearchHistory(q, prev))

    const parsed = parseStructuredSearchQuery(q)
    if (parsed.from?.trim() && parsed.to?.trim()) {
      setCommittedStopPairQuery(q)
      pendingBetweenStopsScrollRef.current = true
    } else {
      setCommittedStopPairQuery('')
      replaceSearchInLocation(q)
      clearStopPairFromLocation()
    }

    const next = defaultClosedRouteGroups()
    for (const section of ROUTE_LIST_UI_SECTION_ORDER) {
      if (countVisibleSectionSlots(section) > 0) next[section] = true
    }
    if (countVisibleSectionSlots('specialSeasonal') > 0) next.unlockable = true
    if (stopLookupRoutes.length > 0) setStopSectionOpen(true)
    if (parsed.from?.trim() && parsed.to?.trim()) setBetweenStopsSectionOpen(true)
    setGroupOpen(next)
  }, [countVisibleSectionSlots, filters.query, stopLookupRoutes.length])

  const handleApplyHistory = useCallback(
    (query: string) => {
      const trimmed = query.trim()
      updateFilter('query', trimmed)
      const parsed = parseStructuredSearchQuery(trimmed)
      if (parsed.from?.trim() && parsed.to?.trim()) {
        setCommittedStopPairQuery(trimmed)
        setBetweenStopsSectionOpen(true)
        pendingBetweenStopsScrollRef.current = true
      }
      searchInputRef.current?.focus()
    },
    [updateFilter],
  )

  const handleClearHistory = useCallback(() => {
    clearSearchHistory()
    setSearchHistory([])
  }, [])

  const renderLockedGameCards = (
    slots: typeof listSectionSlots.specialSeasonal,
  ) =>
    slots.map((slot) => {
      const { route, listedId, directionKey } = slot.entry!
      const directionIndex = getCardDirectionIndex(route, directionKey)

      return (
        <RouteLockedGameCard
          key={`locked-${listedId}`}
          route={route}
          listedId={listedId}
          directionIndex={directionIndex}
          selected={selectedRoute?.id === route.id}
          onNavigate={handleRouteNavigate}
        />
      )
    })

  const renderListSectionCards = (
    section: RouteListUiSectionKey,
    slotsOverride?: typeof listSectionSlots.normal,
  ) =>
    (slotsOverride ?? listSectionSlots[section]).map((slot, index) => {
      const { route, listedId, directionKey } = slot.entry!
      const directionIndex = getCardDirectionIndex(route, directionKey)
      const seasonalLabels = getSeasonalLabelsForRoute(route)

      return (
        <RouteCard
          key={`${section}-${listedId}`}
          route={route}
          displayNumber={listedId !== route.number ? listedId : undefined}
          selected={selectedRoute?.id === route.id}
          directionIndex={directionIndex}
          loopView={getLoopView(route)}
          availabilityRangeLabel={seasonalLabels?.range}
          availabilityUnavailableLabel={seasonalLabels?.unavailableFrom ?? undefined}
          tourAnchor={section === 'normal' && index === 0 ? 'route-card' : undefined}
          onNavigate={handleRouteNavigate}
        />
      )
    })

  const renderFavoriteRouteCards = () =>
    favoriteRoutes.map((route) => (
      <div
        key={`favorite-${route.id}`}
        className={`favorite-draggable ${draggingFavoriteId === route.id ? 'is-dragging' : ''}`}
        draggable
        onDragStart={(event) => {
          setDraggingFavoriteId(route.id)
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', route.id)
        }}
        onDragEnd={() => setDraggingFavoriteId(null)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const dragRouteId = event.dataTransfer.getData('text/plain')
          reorderFavorites(dragRouteId, route.id)
          setDraggingFavoriteId(null)
        }}
      >
        <RouteCard
          route={route}
          selected={selectedRoute?.id === route.id}
          directionIndex={getDirectionIndex(route)}
          loopView={getLoopView(route)}
          muted={!routeMatchesFilters(route, filters)}
          onNavigate={handleRouteNavigate}
        />
      </div>
    ))

  const renderRecentRouteCards = () =>
    recentRoutes.map((route) => (
      <RouteCard
        key={`recent-${route.id}`}
        route={route}
        selected={selectedRoute?.id === route.id}
        directionIndex={getDirectionIndex(route)}
        loopView={getLoopView(route)}
        muted={!routeMatchesFilters(route, filters)}
        onNavigate={handleRouteNavigate}
      />
    ))

  const renderStopRouteCards = () =>
    stopLookupRoutes.map((route) => (
      <RouteCard
        key={`via-stop-${route.id}`}
        route={route}
        selected={selectedRoute?.id === route.id}
        directionIndex={getDirectionIndex(route)}
        loopView={getLoopView(route)}
        onNavigate={handleRouteNavigate}
      />
    ))

  const betweenStopResultCount = betweenStopLookup
    ? betweenStopLookup.routes.length + betweenStopLookup.transferPlans.length
    : 0

  const handleOpenTransferLeg = useCallback(
    (routeId: string, directionDataIndex: number) => {
      const route = findDisplayRoute(routeId)
      const sortedIndex = route
        ? getSortedDirectionIndexFromDataIndex(route, directionDataIndex)
        : directionDataIndex
      setDirectionIndex(routeId, sortedIndex)
      handleRouteNavigate(routeId)
    },
    [findDisplayRoute, handleRouteNavigate, setDirectionIndex],
  )

  const handleSelectTransferPlan = useCallback(
    (plan: TransferPlan, planIndex: number) => {
      if (!betweenStopLookup?.from || !betweenStopLookup?.to) return
      setDailyChallengeRouteContext(null)
      clearSelection()
      clearRouteFromLocation()
      setDetailOverlay({
        kind: 'transfer-plan',
        plan,
        planIndex,
        from: betweenStopLookup.from,
        to: betweenStopLookup.to,
      })
    },
    [betweenStopLookup, clearSelection],
  )

  const stopLookupSummary = useMemo(() => {
    if (matchedStops.length === 0) return ''
    const separator = isChineseLocale(locale) ? '、' : ', '
    const labels: string[] = []
    const seen = new Set<string>()
    for (const stop of matchedStops) {
      const label = getPrimaryText({ zh: stop.zh, en: stop.en }, locale)
      if (!label || seen.has(label)) continue
      seen.add(label)
      labels.push(label)
      if (labels.length >= 3) break
    }
    if (matchedStops.length > 3) {
      return t('stopLookupMatchesMore', {
        stops: labels.join(separator),
        count: matchedStops.length,
      })
    }
    return t('stopLookupMatches', { stops: labels.join(separator) })
  }, [locale, matchedStops, t])

  useRouteListKeyboard({
    enabled: true,
    detailOpen: detailChromeHidden || splitMapDetailOpen,
    onCloseDetail: handleCloseDetail,
    searchInputId: 'route-search',
  })

  const searchToolbar = (
    <SearchToolbar
      value={filters.query}
      onChange={handleSearchQueryChange}
      onSearchCommit={handleSearchCommit}
      resultCount={splitLayoutActive ? realFilteredEntries.length : groupedRouteCount}
      totalCount={splitLayoutActive ? realTotalEntries.length : groupedTotalCount}
      randomEligibleCount={randomEligibleCount}
      onRandom={handleRandomRoute}
      filtersActive={filtersActive}
      zone={filterChipView.zone}
      operator={filterChipView.operator}
      type={filterChipView.type}
      excludedZones={filterChipView.excludedZones}
      excludedOperators={filterChipView.excludedOperators}
      excludedTypes={filterChipView.excludedTypes}
      zones={zones}
      operators={operators}
      types={types}
      onZoneChange={handleZoneFilterChange}
      onOperatorChange={handleOperatorFilterChange}
      onTypeChange={handleTypeFilterChange}
      searchHistory={searchHistory}
      onApplyHistory={handleApplyHistory}
      onClearHistory={handleClearHistory}
      searchInputRef={searchInputRef}
      syntaxVisible={splitLayoutActive ? false : syntaxExpanded}
      onSyntaxToggle={splitLayoutActive ? undefined : handleSyntaxToggle}
      hideRouteCount={splitLayoutActive}
    />
  )

  const splitRouteCountLabel = t('routeCount', {
    count: realFilteredEntries.length,
    total: realTotalEntries.length,
  })

  return (
    <div className={`route-lookup-page${splitLayoutActive ? ' route-lookup-page--split' : ''}`}>
      {splitLayoutActive ? (
        <>
          <RealRouteLookupMusic />
          <div className="route-split-shell">
          <aside className="route-split-sidebar sibs-scrollbar" aria-label={t('routeList')}>
            <div
              ref={stickyToolbarRef}
              className={`route-split-sidebar-toolbar${stickyToolbarFade ? ' route-lookup-sticky--fade' : ''}`}
            >
              <RealRouteSplitHeader />
              {searchToolbar}
            </div>
            <p className="route-split-route-count" aria-live="polite">
              {splitRouteCountLabel}
            </p>
            <RouteLookupSplitList
              normalEntries={realNormalEntries}
              lockedEntries={realLockedEntries}
              unlockCategoryFocus={unlockCategoryFocus}
              onUnlockCategorySelect={handleUnlockCategorySelect}
              unlockableOpen={groupOpen.unlockable}
              lockedOpen={groupOpen.specialSeasonal}
              onUnlockableOpenChange={(open) =>
                setGroupOpen((prev) => ({ ...prev, unlockable: open }))
              }
              onLockedOpenChange={(open) =>
                setGroupOpen((prev) => ({ ...prev, specialSeasonal: open }))
              }
              onViewAllPlayable={handleViewAllPlayable}
              lockedSectionRef={lockedSectionRef}
              selectedListKey={selectedRealListKey}
              onSelect={handleCarouselSelect}
              onOpenDetail={handleOpenDetailInSplit}
              dailyChallenge={
                dailyChallengeVisible
                  ? {
                      visible: true,
                      selected: dailyChallengeSelected,
                      challenge: dailyChallenge,
                      onSelect: handleSelectDailyChallenge,
                      onOpenCalendar: () => setDailyChallengeCalendarOpen(true),
                    }
                  : null
              }
            />
          </aside>
          <div
            className={`route-map-pane${splitMapDetailOpen ? ' route-map-pane--detail-open' : ''}`}
            aria-label={t('islandMapAria')}
          >
            <div className="route-map-pane-map">
              <IslandMapEmbeddedPane />
              {splitMapDetailOpen ? (
                <button
                  type="button"
                  className="route-real-back-btn"
                  onClick={handleCloseDetail}
                  aria-label={t('realMapBack')}
                >
                  <span className="route-real-back-btn-icon" aria-hidden="true">
                    ←
                  </span>
                  {t('realMapBack')}
                </button>
              ) : null}
            </div>
            {splitMapDetailOpen ? (
              <div className="route-split-map-detail" role="region">
                {renderDetailContent()}
              </div>
            ) : null}
          </div>
        </div>
        </>
      ) : (
        <>
      <div
        ref={stickyToolbarRef}
        className={`route-lookup-sticky${stickyToolbarFade ? ' route-lookup-sticky--fade' : ''}`}
      >
        {searchToolbar}
        {syntaxForceOpen ? (
          <div className="search-syntax-pinned">
            <SearchSyntaxHelp stickyRef={stickyToolbarRef} visible />
          </div>
        ) : null}
      </div>

      <div className="content-layout">
        <section className="route-list-section" aria-label={t('routeList')}>
          <div className="route-display-group-list">
            <RouteSearchSyntaxDock
              panelRef={syntaxPanelRef}
              stickyRef={stickyToolbarRef}
              visible={syntaxInFlowVisible}
            />

            {betweenStopPairDraft ? (
              <p className="stop-lookup-summary stop-lookup-pending">{t('betweenStopsPressEnter')}</p>
            ) : null}

            {betweenStopLookup ? (
              <div ref={betweenStopsSectionRef} className="between-stops-section-anchor">
                <RouteGroupCollapse
                  groupId="betweenStops"
                  count={betweenStopResultCount}
                  open={betweenStopsSectionOpen}
                  onOpenChange={setBetweenStopsSectionOpen}
                >
                  <BetweenStopsResults
                    lookup={betweenStopLookup}
                    dailyChallenge={dailyChallenge}
                    departTime={betweenStopsDepartTime}
                    sortMode={betweenStopsSortMode}
                    onSortModeChange={setBetweenStopsSortMode}
                    onDepartTimeChange={setBetweenStopsDepartTime}
                    selectedRouteId={selectedRoute?.id}
                    setDirectionIndex={setDirectionIndex}
                    onSelectPlan={handleSelectTransferPlan}
                    onRouteNavigate={handleRouteNavigate}
                  />
                </RouteGroupCollapse>
              </div>
            ) : null}

            {stopLookupRoutes.length > 0 ? (
              <RouteGroupCollapse
                groupId="viaStop"
                count={stopLookupRoutes.length}
                open={stopSectionOpen}
                onOpenChange={setStopSectionOpen}
              >
                <p className="stop-lookup-summary">{stopLookupSummary}</p>
                <div className="route-grid">{renderStopRouteCards()}</div>
              </RouteGroupCollapse>
            ) : null}

            {dailyChallengeVisible ? (
              <DailyChallengeBanner
                selected={dailyChallengeSelected}
                onSelect={handleSelectDailyChallenge}
                onOpenCalendar={() => setDailyChallengeCalendarOpen(true)}
                challenge={dailyChallenge}
              />
            ) : null}

            {showFavoritesSection ? (
              <RouteListGameSection
                titleKey="favoriteRoutes"
                dataTour="favorites"
                open={groupOpen.favorites}
                onOpenChange={(open) =>
                  setGroupOpen((prev) => ({ ...prev, favorites: open }))
                }
              >
                <FavoritesFolderBar />
                {favoriteRoutes.length > 0 ? (
                  <>
                    <p className="favorite-drag-hint">{t('favoriteDragHint')}</p>
                    <div className="route-grid route-grid--favorites">
                      {renderFavoriteRouteCards()}
                    </div>
                  </>
                ) : (
                  <p className="route-group-empty">{t('favoriteFolderEmpty')}</p>
                )}
              </RouteListGameSection>
            ) : null}

            {recentRoutes.length > 0 ? (
              <RouteListGameSection
                titleKey="recentRoutes"
                open={groupOpen.recent}
                onOpenChange={(open) =>
                  setGroupOpen((prev) => ({ ...prev, recent: open }))
                }
              >
                <div className="route-grid">{renderRecentRouteCards()}</div>
              </RouteListGameSection>
            ) : null}

            {countVisibleSectionSlots('normal') > 0 ? (
              <RouteListGameSection
                titleKey="routeGroupNormal"
                dataTour="route-group-normal"
                open={groupOpen.normal}
                onOpenChange={(open) => setGroupOpen((prev) => ({ ...prev, normal: open }))}
              >
                <div className="route-grid">{renderListSectionCards('normal')}</div>
              </RouteListGameSection>
            ) : null}

            <RouteListGameSection
              titleKey="routeListUnlockable"
              dataTour="route-group-unlockable"
              open={groupOpen.unlockable}
              onOpenChange={(open) => setGroupOpen((prev) => ({ ...prev, unlockable: open }))}
            >
              <RouteUnlockCategoryList
                activeKind={unlockCategoryFocus}
                onSelect={handleUnlockCategorySelect}
              />
            </RouteListGameSection>

            <div ref={lockedSectionRef}>
              <RouteListGameSection
                titleKey="routeListLocked"
                open={groupOpen.specialSeasonal}
                onOpenChange={(open) =>
                  setGroupOpen((prev) => ({ ...prev, specialSeasonal: open }))
                }
              >
                {filteredLockedSlots.length === 0 ? (
                  <p className="empty-state route-group-empty">{t('routeGroupEmpty')}</p>
                ) : (
                  <div className="route-grid route-grid--locked-game">
                    {renderLockedGameCards(filteredLockedSlots)}
                  </div>
                )}
              </RouteListGameSection>
            </div>

            <RouteListViewAllFooter onClick={handleViewAllPlayable} />

            {listIsEmpty ? (
              <p className="empty-state route-grid-span">{t('emptyState')}</p>
            ) : null}
          </div>
        </section>
      </div>
        </>
      )}

      {!splitLayoutActive && detailOverlay && (
        <>
          <button
            ref={backdropRef}
            type="button"
            className={`route-detail-backdrop is-visible${detailClosing ? ' is-closing' : ''}`}
            aria-label={t('closeDetail')}
            onClick={handleCloseDetail}
          />
          <div
            ref={sheetRef}
            className={`route-detail-sheet is-open ${isWideLayout ? 'route-detail-sheet--wide' : ''}${detailClosing ? ' is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
          >
            {renderDetailContent()}
          </div>
        </>
      )}

      <DailyChallengeCalendarDialog
        open={dailyChallengeCalendarOpen}
        onClose={() => setDailyChallengeCalendarOpen(false)}
        onSelectDay={handleSelectScheduleDay}
        todayDate={dailyChallenge.date}
      />
    </div>
  )
}
