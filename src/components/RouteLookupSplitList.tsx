import { useEffect, useRef } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'
import { shouldReduceMotion } from '../storage/appPreferences'
import { RouteCard } from './RouteCard'

interface RouteLookupSplitListProps {
  routes: readonly BusRoute[]
  selectedId: string | null
  getDirectionIndex: (route: BusRoute) => number
  getLoopView: (route: BusRoute) => boolean
  setDirectionIndex: (routeId: string, index: number) => void
  setLoopView: (routeId: string, loopView: boolean) => void
  onSelect: (routeId: string) => void
  onOpenDetail: (routeId: string) => void
}

export function RouteLookupSplitList({
  routes,
  selectedId,
  getDirectionIndex,
  getLoopView,
  setDirectionIndex,
  setLoopView,
  onSelect,
  onOpenDetail,
}: RouteLookupSplitListProps) {
  const { t } = useLocale()
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    if (!selectedId) return
    const node = itemRefs.current.get(selectedId)
    node?.scrollIntoView({
      behavior: shouldReduceMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [selectedId, routes])

  if (routes.length === 0) {
    return <p className="route-split-empty">{t('routeSplitEmpty')}</p>
  }

  return (
    <div ref={listRef} className="route-split-list" role="list">
      {routes.map((route, index) => {
        const directionIndex = getDirectionIndex(route)
        const loopView = getLoopView(route)
        return (
          <div
            key={route.id}
            ref={(node) => {
              if (node) itemRefs.current.set(route.id, node)
              else itemRefs.current.delete(route.id)
            }}
            className="route-split-list-item"
            role="listitem"
            onDoubleClick={() => onOpenDetail(route.id)}
          >
            <RouteCard
              route={route}
              selected={selectedId === route.id}
              directionIndex={directionIndex}
              loopView={loopView}
              appearance="classic"
              onDirectionChange={(nextIndex) => setDirectionIndex(route.id, nextIndex)}
              onLoopViewChange={(nextLoopView) => setLoopView(route.id, nextLoopView)}
              tourAnchor={index === 0 ? 'route-card' : undefined}
              onNavigate={onSelect}
            />
          </div>
        )
      })}
    </div>
  )
}
