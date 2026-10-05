import {
  getTodaysDailyChallenge,
  isDailyChallengeAvailable,
  todayHktDateString,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import { REAL_START_MENU_LAYOUT } from '../data/realStartMenuLayout'
import {
  listUpcomingGameEvents,
  type UpcomingGameEventView,
} from '../data/upcomingGameEvents'
import { readRealStartHasOpenedRoutes } from '../storage/realStartProgress'

export type RealStartRightPanelKind = 'coming-event' | 'daily-challenge' | 'changelog'

export interface RealStartRightPanelState {
  kind: RealStartRightPanelKind
  featuredEvent: UpcomingGameEventView | null
}

/** Active festival first, else nearest upcoming (matches initEventButton.updateFeaturedEvent). */
export function pickFeaturedStartMenuEvent(now = new Date()): UpcomingGameEventView | null {
  const events = listUpcomingGameEvents(now)
  const active = events.filter((event) => event.relativeKey === 'upcomingEventActive')
  if (active.length > 0) return active[0]!
  return events[0] ?? null
}

export function isComingEventHighlightWindow(event: UpcomingGameEventView): boolean {
  if (event.relativeKey === 'upcomingEventActive' || event.relativeKey === 'upcomingEventToday') {
    return true
  }
  if (event.relativeKey === 'upcomingEventInDays') {
    return (event.relativeCount ?? 999) < 14
  }
  return false
}

function daySeededIndex(date: string, modulo: number): number {
  if (modulo <= 0) return 0
  let hash = 0
  for (let i = 0; i < date.length; i += 1) {
    hash = (hash * 31 + date.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % modulo
}

/**
 * StartMenu.Main.R panel selection — mirrors PlayMenu randFeature with nearby-festival priority.
 * New players always see ChangeLog; returning players rotate ComingEvent / DailyChallenge.
 */
export function resolveRealStartRightPanel(
  challenge: DailyChallengeInfo = getTodaysDailyChallenge(),
  now = new Date(),
): RealStartRightPanelState {
  const featured = pickFeaturedStartMenuEvent(now)
  const dailyAvailable = isDailyChallengeAvailable(challenge)
  const today = todayHktDateString(now)

  if (!readRealStartHasOpenedRoutes()) {
    return { kind: 'changelog', featuredEvent: null }
  }

  if (featured && isComingEventHighlightWindow(featured)) {
    return { kind: 'coming-event', featuredEvent: featured }
  }

  const pool: RealStartRightPanelKind[] = ['coming-event']
  if (dailyAvailable) pool.push('daily-challenge')

  const pick = pool[daySeededIndex(today, pool.length)]!

  if (pick === 'daily-challenge' && dailyAvailable) {
    return { kind: 'daily-challenge', featuredEvent: null }
  }

  if (featured) {
    return { kind: 'coming-event', featuredEvent: featured }
  }

  if (dailyAvailable) {
    return { kind: 'daily-challenge', featuredEvent: null }
  }

  return { kind: 'changelog', featuredEvent: null }
}

export function isComingEventCountdownUrgent(event: UpcomingGameEventView): boolean {
  if (event.relativeKey !== 'upcomingEventInDays') return false
  return (event.relativeCount ?? 999) <= REAL_START_MENU_LAYOUT.eventCountdownUrgentDays
}
