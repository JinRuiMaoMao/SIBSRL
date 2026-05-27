import { useCallback, useEffect, useRef, useState } from 'react'
import { RouteCard } from './RouteCard'
import { RouteDetail } from './RouteDetail'
import { RouteFilters } from './RouteFilters'
import { SearchToolbar } from './SearchToolbar'
import { WIDE_LAYOUT_MEDIA } from '../constants/layout'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useRouteSearch } from '../hooks/useRouteSearch'
import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'

/** 详情全屏滑入/滑出时长（毫秒） */
const DETAIL_ANIM_MS = 3000
const DETAIL_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

function motionDurationMs(): number {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduced ? 200 : DETAIL_ANIM_MS
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

export function RouteLookupPage() {
  const { t } = useLocale()
  const isWideLayout = useMediaQuery(WIDE_LAYOUT_MEDIA)
  const [overlayRoute, setOverlayRoute] = useState<BusRoute | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLButtonElement>(null)
  const openAnimsRef = useRef<Animation[]>([])
  const closeAnimsRef = useRef<Animation[]>([])
  const animGenerationRef = useRef(0)

  const {
    filters,
    updateFilter,
    filteredRoutes,
    selectedRoute,
    getDirectionIndex,
    setDirectionIndex,
    selectRoute,
    clearSelection,
    zones,
    operators,
    types,
    totalCount,
  } = useRouteSearch()

  const cancelAnimations = (list: Animation[]) => {
    for (const anim of list) {
      anim.cancel()
    }
    list.length = 0
  }

  const finishDetailClose = useCallback(() => {
    cancelAnimations(openAnimsRef.current)
    cancelAnimations(closeAnimsRef.current)
    setOverlayRoute(null)
    clearSelection()
  }, [clearSelection])

  useEffect(() => {
    if (selectedRoute) {
      setOverlayRoute(selectedRoute)
    }
  }, [selectedRoute?.id])

  useEffect(() => {
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet || !overlayRoute) return

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
  }, [overlayRoute?.id, isWideLayout])

  useEffect(() => {
    if (!overlayRoute) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [overlayRoute])

  const handleSelectRoute = (id: string) => {
    selectRoute(id)
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

  const detailProps = overlayRoute
    ? {
        route: overlayRoute,
        directionIndex: getDirectionIndex(overlayRoute),
        onDirectionChange: (index: number) => setDirectionIndex(overlayRoute.id, index),
        onClose: handleCloseDetail,
      }
    : null

  return (
    <>
      <SearchToolbar
        value={filters.query}
        onChange={(q) => updateFilter('query', q)}
        resultCount={filteredRoutes.length}
        totalCount={totalCount}
      />

      <RouteFilters
        zone={filters.zone}
        operator={filters.operator}
        type={filters.type}
        zones={zones}
        operators={operators}
        types={types}
        onZoneChange={(z) => updateFilter('zone', z)}
        onOperatorChange={(op) => updateFilter('operator', op)}
        onTypeChange={(item) => updateFilter('type', item)}
      />

      <div className="content-layout">
        <section className="route-list-section" aria-label={t('routeList')}>
          {filteredRoutes.length === 0 ? (
            <p className="empty-state">{t('emptyState')}</p>
          ) : (
            <div className="route-grid">
              {filteredRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={selectedRoute?.id === route.id}
                  directionIndex={getDirectionIndex(route)}
                  onDirectionChange={(index) => setDirectionIndex(route.id, index)}
                  onSelect={() => handleSelectRoute(route.id)}
                />
              ))}
            </div>
          )}
          {!selectedRoute && isWideLayout && (
            <p className="detail-list-hint">
              {t('detailPlaceholder')}
              <span className="detail-list-hint-sub">
                {t('detailPlaceholderHint', { total: totalCount })}
              </span>
            </p>
          )}
        </section>
      </div>

      {detailProps && (
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
            <RouteDetail {...detailProps} />
          </div>
        </>
      )}
    </>
  )
}
