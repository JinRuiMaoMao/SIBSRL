import { useEffect, useRef } from 'react'
import { DAILY_CHALLENGE_CARD_ID, type DailyChallengeInfo } from '../data/dailyChallenge'
import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'
import { shouldReduceMotion } from '../storage/appPreferences'
import { DailyChallengeBanner } from './DailyChallengeBanner'
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
  dailyChallenge?: {
    visible: boolean
    selected: boolean
    challenge: DailyChallengeInfo
    onSelect: () => void
    onOpenCalendar: () => void
  } | null
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
  dailyChallenge = null,
}: RouteLookupSplitListProps) {
  const { t } = useLocale()
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLDivElement>())

  const scrollTargetId =
    dailyChallenge?.visible && dailyChallenge.selected
      ? DAILY_CHALLENGE_CARD_ID
      : selectedId

  useEffect(() => {
    if (!scrollTargetId) return
    const node = itemRefs.current.get(scrollTargetId)
    node?.scrollIntoView({
      behavior: shouldReduceMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [scrollTargetId, routes, dailyChallenge?.visible, dailyChallenge?.selected])

  const showDailyChallenge = dailyChallenge?.visible ?? false

  if (routes.length === 0 && !showDailyChallenge) {
    return <p className="route-split-empty">{t('routeSplitEmpty')}</p>
  }

  return (
    <div ref={listRef} className="route-split-list" role="list">
      {showDailyChallenge ? (
        <div
          key={DAILY_CHALLENGE_CARD_ID}
          ref={(node) => {
            if (node) itemRefs.current.set(DAILY_CHALLENGE_CARD_ID, node)
            else itemRefs.current.delete(DAILY_CHALLENGE_CARD_ID)
          }}
          className="route-split-list-item route-split-list-item--daily-challenge"
          role="listitem"
        >
          <DailyChallengeBanner
            selected={dailyChallenge!.selected}
            onSelect={dailyChallenge!.onSelect}
            onOpenCalendar={dailyChallenge!.onOpenCalendar}
            variant="split"
            challenge={dailyChallenge!.challenge}
          />
        </div>
      ) : null}
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
