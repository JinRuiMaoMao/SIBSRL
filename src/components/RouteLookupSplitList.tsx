import { useEffect, useRef } from 'react'
import { DAILY_CHALLENGE_CARD_ID, type DailyChallengeInfo } from '../data/dailyChallenge'
import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'
import { shouldReduceMotion } from '../storage/appPreferences'
import { formatRealRouteDisplayNumber, type RealRouteListEntry } from '../utils/realRouteListEntries'
import { DailyChallengeBanner } from './DailyChallengeBanner'
import { RouteCard } from './RouteCard'

interface RouteLookupSplitListProps {
  entries: readonly RealRouteListEntry[]
  selectedListKey: string | null
  onSelect: (routeId: string, directionIndex: number) => void
  onOpenDetail: (routeId: string, directionIndex: number) => void
  dailyChallenge?: {
    visible: boolean
    selected: boolean
    challenge: DailyChallengeInfo
    onSelect: () => void
    onOpenCalendar: () => void
  } | null
}

export function RouteLookupSplitList({
  entries,
  selectedListKey,
  onSelect,
  onOpenDetail,
  dailyChallenge = null,
}: RouteLookupSplitListProps) {
  const { locale, t } = useLocale()
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLDivElement>())

  const scrollTargetKey =
    dailyChallenge?.visible && dailyChallenge.selected
      ? DAILY_CHALLENGE_CARD_ID
      : selectedListKey

  useEffect(() => {
    if (!scrollTargetKey) return
    const node = itemRefs.current.get(scrollTargetKey)
    node?.scrollIntoView({
      behavior: shouldReduceMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [scrollTargetKey, entries, dailyChallenge?.visible, dailyChallenge?.selected])

  const showDailyChallenge = dailyChallenge?.visible ?? false

  if (entries.length === 0 && !showDailyChallenge) {
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
      {entries.map((entry, index) => {
        const { route, directionIndex, listKey } = entry
        const displayNumber = formatRealRouteDisplayNumber(route, directionIndex, t, locale)

        return (
          <div
            key={listKey}
            data-real-list-key={listKey}
            ref={(node) => {
              if (node) itemRefs.current.set(listKey, node)
              else itemRefs.current.delete(listKey)
            }}
            className="route-split-list-item"
            role="listitem"
            onDoubleClick={() => onOpenDetail(route.id, directionIndex)}
          >
            <RouteCard
              route={route}
              selected={selectedListKey === listKey}
              directionIndex={directionIndex}
              loopView={false}
              displayNumber={displayNumber}
              hideDirectionControls
              appearance="classic"
              onDirectionChange={() => {}}
              tourAnchor={index === 0 ? 'route-card' : undefined}
              onNavigate={() => onSelect(route.id, directionIndex)}
            />
          </div>
        )
      })}
    </div>
  )
}
