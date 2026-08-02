import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { DAILY_CHALLENGE_CARD_ID, type DailyChallengeInfo } from '../data/dailyChallenge'
import { useLocale } from '../i18n/LocaleContext'
import { shouldReduceMotion } from '../storage/appPreferences'
import {
  partitionRealRouteListEntriesByUnlockCategory,
  type RealRouteListEntry,
} from '../utils/realRouteListEntries'
import { listedIdFromRealRouteListKey } from '../utils/lockedRouteDisplayOrder'
import { lockedCardDisplayNumber, resolveShiftUnlockListedRouteId } from '../data/routeShiftUnlocks'
import { DailyChallengeBanner } from './DailyChallengeBanner'
import { RouteCard } from './RouteCard'
import { RouteLockedGameCard } from './RouteLockedGameCard'
import { RouteLockedUnlockCategorySections } from './RouteLockedUnlockCategorySections'
import { RouteListGameSection } from './RouteListGameSection'
import { RouteListViewAllFooter } from './RouteListViewAllFooter'
import { RouteUnlockCategoryList } from './RouteUnlockCategoryList'
import type { RouteUnlockCategoryKind } from './RouteUnlockCategoryCard'

interface RouteLookupSplitListProps {
  normalEntries: readonly RealRouteListEntry[]
  lockedEntries: readonly RealRouteListEntry[]
  unlockCategoryFocus: RouteUnlockCategoryKind | null
  onUnlockCategorySelect: (kind: RouteUnlockCategoryKind) => void
  unlockableOpen: boolean
  lockedOpen: boolean
  onUnlockableOpenChange: (open: boolean) => void
  onLockedOpenChange: (open: boolean) => void
  onViewAllPlayable: () => void
  lockedSectionRef?: RefObject<HTMLElement | null>
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
  normalEntries,
  lockedEntries,
  unlockCategoryFocus,
  onUnlockCategorySelect,
  unlockableOpen,
  lockedOpen,
  onUnlockableOpenChange,
  onLockedOpenChange,
  onViewAllPlayable,
  lockedSectionRef,
  selectedListKey,
  onSelect,
  onOpenDetail,
  dailyChallenge = null,
}: RouteLookupSplitListProps) {
  const { t } = useLocale()
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const lockedEntriesByCategory = useMemo(
    () => partitionRealRouteListEntriesByUnlockCategory(lockedEntries),
    [lockedEntries],
  )
  const visibleLockedEntries = useMemo(
    () => [...lockedEntriesByCategory.seasonal, ...lockedEntriesByCategory.special, ...lockedEntriesByCategory.shift],
    [lockedEntriesByCategory],
  )

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
    normalEntries,
    visibleLockedEntries,
    dailyChallenge?.visible,
    dailyChallenge?.selected,
  ])

  const showDailyChallenge = dailyChallenge?.visible ?? false
  const hasEntries = normalEntries.length > 0 || lockedEntries.length > 0

  if (!hasEntries && !showDailyChallenge) {
    return <p className="route-split-empty">{t('routeSplitEmpty')}</p>
  }

  const renderEntry = (entry: RealRouteListEntry, index: number, tourAnchor: boolean) => {
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
          tourAnchor={tourAnchor ? 'route-card' : undefined}
          onNavigate={() => onSelect(route.id, directionIndex)}
          onOpenDetail={() => onOpenDetail(route.id, directionIndex)}
        />
      </div>
    )
  }

  const renderLockedEntry = (entry: RealRouteListEntry) => {
    const { route, directionIndex, listKey } = entry
    const directionKey = route.stops?.[directionIndex]?.directionKey
    const sunshardListedId = listedIdFromRealRouteListKey(listKey)
    const listedId = sunshardListedId ?? resolveShiftUnlockListedRouteId(route, directionIndex)

    return (
      <div
        key={listKey}
        data-real-list-key={listKey}
        ref={(node) => {
          if (node) itemRefs.current.set(listKey, node)
          else itemRefs.current.delete(listKey)
        }}
        className="route-split-list-item route-split-list-item--locked-game"
        role="listitem"
      >
        <RouteLockedGameCard
          route={route}
          listedId={listedId}
          displayNumber={
            listedId && listedId !== route.number && listedId !== route.id
              ? listedId
              : lockedCardDisplayNumber(route, listedId, directionKey)
          }
          selected={selectedListKey === listKey}
          directionIndex={directionIndex}
          onNavigate={() => onSelect(route.id, directionIndex)}
          onOpenDetail={() => onOpenDetail(route.id, directionIndex)}
        />
      </div>
    )
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

      {normalEntries.map((entry, index) => renderEntry(entry, index, index === 0))}

      <RouteListGameSection
        titleKey="routeListUnlockable"
        dataTour="route-group-unlockable"
        open={unlockableOpen}
        onOpenChange={onUnlockableOpenChange}
      >
        <RouteUnlockCategoryList
          activeKind={unlockCategoryFocus}
          onSelect={onUnlockCategorySelect}
        />
      </RouteListGameSection>

      <div ref={lockedSectionRef as RefObject<HTMLDivElement>}>
        <RouteListGameSection
          titleKey="routeListLocked"
          open={lockedOpen}
          onOpenChange={onLockedOpenChange}
        >
          <RouteLockedUnlockCategorySections
            groups={lockedEntriesByCategory}
            highlightKind={unlockCategoryFocus}
            layout="list"
            renderItems={(entries) => entries.map((entry) => renderLockedEntry(entry))}
            emptyFallback={
              <p className="route-split-empty route-group-empty">{t('routeGroupEmpty')}</p>
            }
          />
        </RouteListGameSection>
      </div>

      <RouteListViewAllFooter onClick={onViewAllPlayable} />
    </div>
  )
}
