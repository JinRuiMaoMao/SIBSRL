import { useCallback, useEffect, useRef } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'
import { shouldReduceMotion } from '../storage/appPreferences'
import { RouteCard } from './RouteCard'

interface RouteLookupCarouselProps {
  routes: readonly BusRoute[]
  selectedId: string | null
  getDirectionIndex: (route: BusRoute) => number
  getLoopView: (route: BusRoute) => boolean
  setDirectionIndex: (routeId: string, index: number) => void
  setLoopView: (routeId: string, loopView: boolean) => void
  onSelect: (routeId: string) => void
  onOpenDetail: (routeId: string) => void
}

export function RouteLookupCarousel({
  routes,
  selectedId,
  getDirectionIndex,
  getLoopView,
  setDirectionIndex,
  setLoopView,
  onSelect,
  onOpenDetail,
}: RouteLookupCarouselProps) {
  const { t } = useLocale()
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const scrollSyncRef = useRef(false)

  const registerItem = useCallback((routeId: string, node: HTMLDivElement | null) => {
    if (node) itemRefs.current.set(routeId, node)
    else itemRefs.current.delete(routeId)
  }, [])

  useEffect(() => {
    if (!selectedId || scrollSyncRef.current) return
    const node = itemRefs.current.get(selectedId)
    if (!node || !trackRef.current) return
    node.scrollIntoView({
      behavior: shouldReduceMotion() ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest',
    })
  }, [selectedId, routes])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollSyncRef.current) return
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!best) return
        const routeId = best.target.getAttribute('data-route-id')
        if (routeId && routeId !== selectedId) onSelect(routeId)
      },
      { root: track, threshold: [0.55, 0.75, 0.95] },
    )

    itemRefs.current.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [onSelect, routes, selectedId])

  const scrollByCard = useCallback((direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    const width = track.clientWidth
    scrollSyncRef.current = true
    track.scrollBy({
      left: direction * width,
      behavior: shouldReduceMotion() ? 'auto' : 'smooth',
    })
    window.setTimeout(() => {
      scrollSyncRef.current = false
    }, 320)
  }, [])

  if (routes.length === 0) {
    return <p className="route-split-empty">{t('routeSplitEmpty')}</p>
  }

  const selectedIndex = selectedId ? routes.findIndex((route) => route.id === selectedId) : -1

  return (
    <div className="route-split-carousel">
      <div className="route-split-carousel-toolbar">
        <span className="route-split-carousel-count">
          {selectedIndex >= 0
            ? t('routeSplitCarouselPosition', {
                current: selectedIndex + 1,
                total: routes.length,
              })
            : t('routeSplitCarouselTotal', { total: routes.length })}
        </span>
        <div className="route-split-carousel-nav">
          <button
            type="button"
            className="route-split-carousel-btn"
            onClick={() => scrollByCard(-1)}
            disabled={selectedIndex <= 0}
            aria-label={t('routeSplitCarouselPrev')}
          >
            ‹
          </button>
          <button
            type="button"
            className="route-split-carousel-btn"
            onClick={() => scrollByCard(1)}
            disabled={selectedIndex < 0 || selectedIndex >= routes.length - 1}
            aria-label={t('routeSplitCarouselNext')}
          >
            ›
          </button>
        </div>
      </div>

      <div ref={trackRef} className="route-split-carousel-track" role="list">
        {routes.map((route, index) => {
          const directionIndex = getDirectionIndex(route)
          const loopView = getLoopView(route)
          return (
            <div
              key={route.id}
              ref={(node) => registerItem(route.id, node)}
              data-route-id={route.id}
              className="route-split-carousel-slide"
              role="listitem"
              onDoubleClick={() => onOpenDetail(route.id)}
            >
              <RouteCard
                route={route}
                selected={selectedId === route.id}
                directionIndex={directionIndex}
                loopView={loopView}
                onDirectionChange={(nextIndex) => setDirectionIndex(route.id, nextIndex)}
                onLoopViewChange={(nextLoopView) => setLoopView(route.id, nextLoopView)}
                tourAnchor={index === 0 ? 'route-card' : undefined}
                onNavigate={onSelect}
              />
              <p className="route-split-open-hint">{t('routeSplitOpenDetailHint')}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
