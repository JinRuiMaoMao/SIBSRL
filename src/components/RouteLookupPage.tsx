import { useCallback, useEffect, useRef, useState } from 'react'
import { RouteCard } from './RouteCard'
import { RouteDetail } from './RouteDetail'
import { RouteFilters } from './RouteFilters'
import { SearchToolbar } from './SearchToolbar'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useRouteSearch } from '../hooks/useRouteSearch'
import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'

const SHEET_ANIM_MS = 450
const SHEET_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

function runSheetAnimation(
  el: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return el.animate(keyframes, {
    ...options,
    duration: reduced ? 1 : options.duration,
    fill: 'forwards',
  })
}

export function RouteLookupPage() {
  const { t } = useLocale()
  const isWideLayout = useMediaQuery('(min-width: 901px)')
  const [sheetRoute, setSheetRoute] = useState<BusRoute | null>(null)
  const [detailRevealKey, setDetailRevealKey] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLButtonElement>(null)
  const openAnimRef = useRef<Animation | null>(null)
  const closeAnimRef = useRef<Animation | null>(null)

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

  const cancelSheetAnimations = () => {
    openAnimRef.current?.cancel()
    closeAnimRef.current?.cancel()
    openAnimRef.current = null
    closeAnimRef.current = null
  }

  const finishMobileClose = useCallback(() => {
    cancelSheetAnimations()
    setSheetRoute(null)
    clearSelection()
  }, [clearSelection])

  useEffect(() => {
    return () => cancelSheetAnimations()
  }, [])

  useEffect(() => {
    if (!selectedRoute || isWideLayout) {
      cancelSheetAnimations()
      setSheetRoute(null)
      return
    }
    setSheetRoute(selectedRoute)
  }, [selectedRoute?.id, isWideLayout])

  useEffect(() => {
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet || !sheetRoute || isWideLayout) return

    cancelSheetAnimations()
    sheet.style.transform = 'translate3d(0, 100%, 0)'
    sheet.style.visibility = 'visible'
    sheet.style.pointerEvents = 'auto'
    if (backdrop) backdrop.style.opacity = '0'

    let cancelled = false
    void (async () => {
      if (backdrop) {
        await runSheetAnimation(
          backdrop,
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: SHEET_ANIM_MS, easing: 'ease', fill: 'forwards' },
        )
      }
      if (cancelled) return
      const anim = await runSheetAnimation(
        sheet,
        [{ transform: 'translate3d(0, 100%, 0)' }, { transform: 'translate3d(0, 0, 0)' }],
        { duration: SHEET_ANIM_MS, easing: SHEET_EASING, fill: 'forwards' },
      )
      openAnimRef.current = anim
      await anim.finished.catch(() => undefined)
    })()

    return () => {
      cancelled = true
      cancelSheetAnimations()
    }
  }, [sheetRoute?.id, isWideLayout])

  useEffect(() => {
    if (!sheetRoute || isWideLayout) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sheetRoute, isWideLayout])

  const handleSelectRoute = (id: string) => {
    cancelSheetAnimations()
    selectRoute(id)
    setDetailRevealKey((k) => k + 1)
  }

  const handleCloseDetail = () => {
    if (isWideLayout) {
      clearSelection()
      return
    }

    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet) {
      finishMobileClose()
      return
    }

    cancelSheetAnimations()
    void (async () => {
      const sheetAnim = runSheetAnimation(
        sheet,
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: 'translate3d(0, 100%, 0)' }],
        { duration: SHEET_ANIM_MS, easing: SHEET_EASING, fill: 'forwards' },
      )
      closeAnimRef.current = sheetAnim
      const anims: Promise<unknown>[] = [sheetAnim.finished]
      if (backdrop) {
        const backdropAnim = runSheetAnimation(backdrop, [{ opacity: 1 }, { opacity: 0 }], {
          duration: SHEET_ANIM_MS,
          easing: 'ease',
          fill: 'forwards',
        })
        anims.push(backdropAnim.finished)
      }
      await Promise.all(anims.map((p) => p.catch(() => undefined)))
      finishMobileClose()
    })()
  }

  const buildDetailProps = (route: BusRoute) => ({
    route,
    directionIndex: getDirectionIndex(route),
    onDirectionChange: (index: number) => setDirectionIndex(route.id, index),
    onClose: handleCloseDetail,
  })

  const mobileRoute = !isWideLayout ? (selectedRoute ?? sheetRoute) : null
  const wideDetailProps = selectedRoute && isWideLayout ? buildDetailProps(selectedRoute) : null
  const mobileDetailProps = mobileRoute ? buildDetailProps(mobileRoute) : null

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
        </section>

        {isWideLayout &&
          (wideDetailProps ? (
            <RouteDetail
              key={`${wideDetailProps.route.id}-${detailRevealKey}`}
              {...wideDetailProps}
              className="route-detail--enter"
            />
          ) : (
            <aside className="route-detail placeholder">
              <p>{t('detailPlaceholder')}</p>
              <p className="placeholder-hint">
                {t('detailPlaceholderHint', { total: totalCount })}
              </p>
            </aside>
          ))}
      </div>

      {mobileDetailProps && (
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
            className="route-detail-sheet is-open"
            role="dialog"
            aria-modal="true"
          >
            <RouteDetail {...mobileDetailProps} />
          </div>
        </>
      )}
    </>
  )
}
