import { useEffect, useRef, type ReactNode } from 'react'
import { DAILY_CHALLENGE_CARD_ID, type DailyChallengeInfo } from '../data/dailyChallenge'
import { useLocale } from '../i18n/LocaleContext'
import { shouldReduceMotion } from '../storage/appPreferences'
import { type RealRouteListEntry } from '../utils/realRouteListEntries'
import { DailyChallengeBanner } from './DailyChallengeBanner'
import { RouteCard } from './RouteCard'
import { RouteListGameSection } from './RouteListGameSection'
import { RouteListViewAllFooter } from './RouteListViewAllFooter'

interface RouteLookupSplitListProps {
  unlockableEntries: readonly RealRouteListEntry[]
  lockedEntries: readonly RealRouteListEntry[]
  unlockableOpen: boolean
  lockedOpen: boolean
  onUnlockableOpenChange: (open: boolean) => void
  onLockedOpenChange: (open: boolean) => void
  onViewAllPlayable: () => void
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
  unlockableEntries,
  lockedEntries,
  unlockableOpen,
  lockedOpen,
  onUnlockableOpenChange,
  onLockedOpenChange,
  onViewAllPlayable,
  selectedListKey,
  onSelect,
  onOpenDetail,
  dailyChallenge = null,
}: RouteLookupSplitListProps) {
  const { t } = useLocale()
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
  }, [
    scrollTargetKey,
    unlockableEntries,
    lockedEntries,
    dailyChallenge?.visible,
    dailyChallenge?.selected,
  ])

  const showDailyChallenge = dailyChallenge?.visible ?? false
  const hasEntries = unlockableEntries.length > 0 || lockedEntries.length > 0

  if (!hasEntries && !showDailyChallenge) {
    return <p className="route-split-empty">{t('routeSplitEmpty')}</p>
  }

  const renderEntry = (entry: RealRouteListEntry, index: number) => {
    const { route, directionIndex, listKey } = entry

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
      >
        <RouteCard
          route={route}
          selected={selectedListKey === listKey}
          directionIndex={directionIndex}
          loopView={false}
          appearance="classic"
          tourAnchor={index === 0 ? 'route-card' : undefined}
          onNavigate={() => onSelect(route.id, directionIndex)}
          onOpenDetail={() => onOpenDetail(route.id, directionIndex)}
        />
      </div>
    )
  }

  const unlockableContent: ReactNode[] = []

  if (showDailyChallenge) {
    unlockableContent.push(
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
      </div>,
    )
  }

  for (const [index, entry] of unlockableEntries.entries()) {
    unlockableContent.push(renderEntry(entry, index))
  }

  const lockedContent = lockedEntries.map((entry, index) => renderEntry(entry, index))

  return (
    <div ref={listRef} className="route-split-list" role="list">
      <RouteListGameSection
        titleKey="routeListUnlockable"
        dataTour="route-group-normal"
        open={unlockableOpen}
        onOpenChange={onUnlockableOpenChange}
      >
        {unlockableContent.length > 0 ? (
          unlockableContent
        ) : (
          <p className="route-split-empty route-group-empty">{t('routeGroupEmpty')}</p>
        )}
      </RouteListGameSection>

      <RouteListGameSection
        titleKey="routeListLocked"
        open={lockedOpen}
        onOpenChange={onLockedOpenChange}
      >
        {lockedContent.length > 0 ? (
          lockedContent
        ) : (
          <p className="route-split-empty route-group-empty">{t('routeGroupEmpty')}</p>
        )}
      </RouteListGameSection>

      <RouteListViewAllFooter onClick={onViewAllPlayable} />
    </div>
  )
}
