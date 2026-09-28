import eventsJson from '../../data/upcoming-game-events.json'
import { todayHktDateString } from './dailyChallenge'
import type { BilingualText } from '../types/route'

export type UpcomingGameEventThumbnail = 'daytime' | 'night' | 'depot'

export interface UpcomingGameEvent {
  id: string
  title: BilingualText
  start: string
  end?: string
  thumbnail: UpcomingGameEventThumbnail
}

export type UpcomingEventRelativeKey =
  | 'upcomingEventInDays'
  | 'upcomingEventInMonths'
  | 'upcomingEventToday'
  | 'upcomingEventActive'

export interface UpcomingGameEventView extends UpcomingGameEvent {
  relativeKey: UpcomingEventRelativeKey
  relativeCount?: number
}

const events = (eventsJson as { events: UpcomingGameEvent[] }).events

function diffGameDays(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T08:00:00+08:00`)
  const toMs = Date.parse(`${to}T08:00:00+08:00`)
  return Math.ceil((toMs - fromMs) / 86_400_000)
}

function isEventActive(today: string, event: UpcomingGameEvent): boolean {
  if (today < event.start) return false
  if (!event.end) return today === event.start
  return today <= event.end
}

/** 尚未结束、按开始日排序的节庆（含进行中）。 */
export function listUpcomingGameEvents(now = new Date()): UpcomingGameEventView[] {
  const today = todayHktDateString(now)

  return events
    .map((event): UpcomingGameEventView | null => {
      if (event.end && today > event.end) return null

      if (isEventActive(today, event)) {
        return { ...event, relativeKey: 'upcomingEventActive' }
      }

      const daysUntil = diffGameDays(today, event.start)
      if (daysUntil < 0) return null

      if (daysUntil === 0) {
        return { ...event, relativeKey: 'upcomingEventToday' }
      }

      if (daysUntil < 30) {
        return { ...event, relativeKey: 'upcomingEventInDays', relativeCount: daysUntil }
      }

      return {
        ...event,
        relativeKey: 'upcomingEventInMonths',
        relativeCount: Math.max(1, Math.round(daysUntil / 30)),
      }
    })
    .filter((event): event is UpcomingGameEventView => event != null)
    .sort((a, b) => a.start.localeCompare(b.start))
}
