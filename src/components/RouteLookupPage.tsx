import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DAILY_CHALLENGE_CARD_ID,
  findRouteForDailyChallenge,
  findDailyChallengeDirectionIndex,
  getTodaysDailyChallenge,
  isPrivateHireChallengeRoute,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import { DailyChallengeBanner } from './DailyChallengeBanner'
import { DailyChallengeDetail } from './DailyChallengeDetail'
import { RouteNotFoundDetail } from './RouteNotFoundDetail'
import { RouteCard } from './RouteCard'
import { RouteDetail } from './RouteDetail'
import { SearchToolbar } from './SearchToolbar'
import { WIDE_LAYOUT_MEDIA } from '../constants/layout'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useRouteSearch } from '../hooks/useRouteSearch'
import { useStickyLayoutOffsets } from '../hooks/useStickyLayoutOffsets'
import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'
import type { RoutePageData } from '../types/routePageData'
import { loadRoutePageData } from '../utils/loadRoutePageData'
import { clearRouteFromLocation, readRouteQueryFromLocation, setRouteInLocation } from '../utils/routeNavigation'

type DetailOverlay =
  | { kind: 'route'; route: BusRoute }
  | { kind: 'daily-challenge'; challenge: DailyChallengeInfo }
  | { kind: 'not-found'; routeId: string }
  | null

function overlayKey(overlay: DetailOverlay): string | null {
  if (!overlay) return null
  if (overlay.kind === 'route') return overlay.route.id
  if (overlay.kind === 'not-found') return `not-found-${overlay.routeId}`
  return `daily-challenge-${overlay.challenge.date}`
}

/** 详情全屏滑入/滑出时长（毫秒） */
const DETAIL_ANIM_MS = 500
const DETAIL_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

function motionDurationMs(): number {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduced ? 200 : DETAIL_ANIM_MS
}

function scrollRouteCardIntoView(routeId: string) {
  const el = document.querySelector<HTMLElement>(
    `[data-route-id="${CSS.escape(routeId)}"]`,
  )
  if (!el) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
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
  onRouteCardNavigate?: () => void
}

export function RouteLookupPage({
  pendingDailyChallengeDetail = 0,
  onPendingDailyChallengeDetailConsumed,
  onRouteCardNavigate,
}: RouteLookupPageProps) {
  const { t } = useLocale()
  const isWideLayout = useMediaQuery(WIDE_LAYOUT_MEDIA)
  useStickyLayoutOffsets()
  const [detailOverlay, setDetailOverlay] = useState<DetailOverlay>(null)
  const [dailyChallengeRouteView, setDailyChallengeRouteView] = useState(false)
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
    dailyChallengeVisible,
    selectedRoute,
    getDirectionIndex,
    setDirectionIndex,
    selectRoute,
    selectRandomRoute,
    randomEligibleCount,
    clearSelection,
    findDisplayRoute,
    zones,
    operators,
    types,
    totalCount,
  } = useRouteSearch()

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
    setDetailOverlay(null)
    setRoutePageDetail(null)
    setDailyChallengeRouteView(false)
    clearSelection()
    clearRouteFromLocation()
    document.body.style.overflow = ''
  }, [clearSelection])

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

  useEffect(() => {
    const routeId = readRouteQueryFromLocation()
    if (!routeId) return

    const route = findDisplayRoute(routeId)
    if (route) {
      setDailyChallengeRouteView(false)
      selectRoute(routeId)
      return
    }

    clearSelection()
    setDetailOverlay({ kind: 'not-found', routeId })
  }, [clearSelection, findDisplayRoute, selectRoute])

  useEffect(() => {
    if (!selectedRoute) return
    setDetailOverlay({ kind: 'route', route: selectedRoute })
  }, [selectedRoute])

  useEffect(() => {
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet || !detailOverlay) return

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
  }, [activeOverlayKey, isWideLayout])

  useEffect(() => {
    if (!detailOverlay) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [detailOverlay])

  const handleSelectDailyChallenge = useCallback(() => {
    const challenge = getTodaysDailyChallenge()
    const routeNumber = challenge.routeNumber

    if (routeNumber && !isPrivateHireChallengeRoute(routeNumber)) {
      const route = findRouteForDailyChallenge(routeNumber)
      if (route) {
        const directionIndex = findDailyChallengeDirectionIndex(route, challenge.directionKey)
        if (directionIndex != null) setDirectionIndex(route.id, directionIndex)
        setDailyChallengeRouteView(true)
        selectRoute(route.id)
        return
      }
    }

    setDailyChallengeRouteView(false)
    clearSelection()
    setDetailOverlay({ kind: 'daily-challenge', challenge })
  }, [clearSelection, selectRoute, setDirectionIndex])

  const handleRouteNavigate = useCallback(
    (routeId: string) => {
      setDailyChallengeRouteView(false)
      onRouteCardNavigate?.()
      selectRoute(routeId)
      setRouteInLocation(routeId)
    },
    [onRouteCardNavigate, selectRoute],
  )

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
    const id = selectRandomRoute()
    if (!id) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRouteCardIntoView(id))
    })
  }

  const handleCloseDetail = () => {
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

  const filtersActive =
    filters.routeGroup !== 'all' ||
    filters.zone !== 'all' ||
    filters.operator !== 'all' ||
    filters.type !== 'all'

  const dailyChallengeSelected =
    detailOverlay?.kind === 'daily-challenge' || dailyChallengeRouteView
  const todaysChallenge = getTodaysDailyChallenge()
  const routeDetailProps =
    detailOverlay?.kind === 'route'
      ? {
          route: routePageDetail?.route ?? detailOverlay.route,
          pageData: routePageDetail?.pageData ?? null,
          directionIndex: getDirectionIndex(detailOverlay.route),
          onDirectionChange: (index: number) =>
            setDirectionIndex(detailOverlay.route.id, index),
          onClose: handleCloseDetail,
          lockDirection: dailyChallengeRouteView,
          directionEndpoints: dailyChallengeRouteView
            ? (todaysChallenge.endpoints ?? null)
            : null,
          dailyChallengeIntro: dailyChallengeRouteView
            ? (todaysChallenge.intro ?? null)
            : null,
        }
      : null

  return (
    <div className="route-lookup-page">
      <div className="route-lookup-sticky">
        <SearchToolbar
          value={filters.query}
          onChange={(q) => updateFilter('query', q)}
          resultCount={filteredRoutes.length}
          totalCount={totalCount}
          randomEligibleCount={randomEligibleCount}
          onRandom={handleRandomRoute}
          filtersActive={filtersActive}
          routeGroup={filters.routeGroup}
          zone={filters.zone}
          operator={filters.operator}
          type={filters.type}
          zones={zones}
          operators={operators}
          types={types}
          onRouteGroupChange={(group) => updateFilter('routeGroup', group)}
          onZoneChange={(z) => updateFilter('zone', z)}
          onOperatorChange={(op) => updateFilter('operator', op)}
          onTypeChange={(item) => updateFilter('type', item)}
        />
      </div>

      <div className="content-layout">
        <section className="route-list-section" aria-label={t('routeList')}>
          <div className="route-grid">
            {dailyChallengeVisible ? (
              <DailyChallengeBanner
                selected={dailyChallengeSelected}
                onSelect={handleSelectDailyChallenge}
              />
            ) : null}
            {filteredRoutes.length === 0 && !dailyChallengeVisible ? (
              <p className="empty-state route-grid-span">{t('emptyState')}</p>
            ) : (
              filteredRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={selectedRoute?.id === route.id}
                  directionIndex={getDirectionIndex(route)}
                  onDirectionChange={(index) => setDirectionIndex(route.id, index)}
                  onNavigate={handleRouteNavigate}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {detailOverlay && (
        <>
          <button
            ref={backdropRef}
            type="button"
            className="route-detail-backdrop is-visible"
            aria-label={t('closeDetail')}
            onClick={handleCloseDetail}
          />
          <div
            ref={sheetRef}
            className={`route-detail-sheet is-open ${isWideLayout ? 'route-detail-sheet--wide' : ''}`}
            role="dialog"
            aria-modal="true"
          >
            {routeDetailProps ? (
              <RouteDetail {...routeDetailProps} />
            ) : detailOverlay.kind === 'daily-challenge' ? (
              <DailyChallengeDetail
                challenge={detailOverlay.challenge}
                onClose={handleCloseDetail}
              />
            ) : detailOverlay.kind === 'not-found' ? (
              <RouteNotFoundDetail
                routeId={detailOverlay.routeId}
                onClose={handleCloseDetail}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
