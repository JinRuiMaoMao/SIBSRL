import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findSecretRoute, secretRoutes } from '../data/secretRoutes'
import { WIDE_LAYOUT_MEDIA } from '../constants/layout'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useStickyLayoutOffsets } from '../hooks/useStickyLayoutOffsets'
import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'
import {
  clearRouteFromLocation,
  readRouteQueryFromLocation,
  setRouteInLocation,
} from '../utils/routeNavigation'
import { lockPageScroll } from '../utils/pageScrollLock'
import { RouteCard } from './RouteCard'
import { RouteDetail } from './RouteDetail'
import { RouteNotFoundDetail } from './RouteNotFoundDetail'

const DETAIL_ANIM_MS = 500
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

function secretRouteHref(routeId: string): string {
  return `secret.html?route=${encodeURIComponent(routeId)}`
}

export function SecretRoutesPage() {
  const { t } = useLocale()
  const isWideLayout = useMediaQuery(WIDE_LAYOUT_MEDIA)
  useStickyLayoutOffsets()

  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null)
  const [directionByRoute, setDirectionByRoute] = useState<Record<string, number>>({})
  const [notFoundRouteId, setNotFoundRouteId] = useState<string | null>(null)

  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLButtonElement>(null)
  const openAnimsRef = useRef<Animation[]>([])
  const closeAnimsRef = useRef<Animation[]>([])
  const animGenerationRef = useRef(0)

  const detailOpen = selectedRoute != null || notFoundRouteId != null
  const activeOverlayKey = selectedRoute?.id ?? (notFoundRouteId ? `nf-${notFoundRouteId}` : null)

  const getDirectionIndex = useCallback(
    (route: BusRoute) => directionByRoute[route.id] ?? 0,
    [directionByRoute],
  )

  const setDirectionIndex = useCallback((routeId: string, index: number) => {
    setDirectionByRoute((prev) => ({ ...prev, [routeId]: index }))
  }, [])

  const cancelAnimations = (list: Animation[]) => {
    for (const anim of list) anim.cancel()
    list.length = 0
  }

  const finishDetailClose = useCallback(() => {
    cancelAnimations(openAnimsRef.current)
    cancelAnimations(closeAnimsRef.current)
    setSelectedRoute(null)
    setNotFoundRouteId(null)
    clearRouteFromLocation()
  }, [])

  const openRoute = useCallback((routeId: string) => {
    const route = findSecretRoute(routeId)
    if (!route) {
      setSelectedRoute(null)
      setNotFoundRouteId(routeId)
      setRouteInLocation(routeId)
      return
    }
    setNotFoundRouteId(null)
    setSelectedRoute(route)
    setRouteInLocation(route.id)
  }, [])

  useEffect(() => {
    const routeId = readRouteQueryFromLocation()
    if (!routeId) return
    openRoute(routeId)
  }, [openRoute])

  useEffect(() => {
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet || !detailOpen) return

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
        runDetailAnimation(backdrop, [{ opacity: 0 }, { opacity: 1 }], {
          duration,
          easing: 'ease',
        }),
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
  }, [activeOverlayKey, detailOpen, isWideLayout])

  useEffect(() => {
    if (!detailOpen) return
    return lockPageScroll()
  }, [detailOpen])

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

  const routeDetailProps = useMemo(() => {
    if (!selectedRoute) return null
    return {
      route: selectedRoute,
      pageData: null,
      directionIndex: getDirectionIndex(selectedRoute),
      onDirectionChange: (index: number) => setDirectionIndex(selectedRoute.id, index),
      onClose: handleCloseDetail,
    }
  }, [getDirectionIndex, selectedRoute, setDirectionIndex])

  return (
    <div className="route-lookup-page secret-routes-page">
      <p className="page-intro secret-page-intro">{t('secretPageIntro')}</p>

      <div className="content-layout">
        <section className="route-list-section" aria-label={t('secretRouteList')}>
          <div className="route-grid">
            {secretRoutes.length === 0 ? (
              <p className="empty-state route-grid-span">{t('secretEmptyState')}</p>
            ) : (
              secretRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={selectedRoute?.id === route.id}
                  directionIndex={getDirectionIndex(route)}
                  onDirectionChange={(index) => setDirectionIndex(route.id, index)}
                  href={secretRouteHref(route.id)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {detailOpen && (
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
            ) : notFoundRouteId ? (
              <RouteNotFoundDetail routeId={notFoundRouteId} onClose={handleCloseDetail} />
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
