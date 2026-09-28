import eventsJson from '../../data/upcoming-game-events.json'
import { resolveSiteAssetUrl } from '../utils/appLayoutMode'
import type { Locale } from '../i18n/types'
import { todayHktDateString } from './dailyChallenge'
import type { BilingualText } from '../types/route'

export type UpcomingGameEventThumbnail = 'chung-qingming' | 'lunar-new-year' | 'ft-anniversary'

const THUMBNAIL_FILES: Record<UpcomingGameEventThumbnail, string> = {
  'chung-qingming': 'game-events/重阳清明节.png',
  'lunar-new-year': 'game-events/新年中秋节.png',
  'ft-anniversary': 'game-events/FT纪念.png',
}

export function getUpcomingGameEventThumbnailUrl(thumbnail: UpcomingGameEventThumbnail): string {
  return resolveSiteAssetUrl(THUMBNAIL_FILES[thumbnail])
}

export interface UpcomingGameEventRoute {
  code: string
  endpoints: BilingualText
}

export interface UpcomingGameEventDetail {
  aboutHighlight?: BilingualText
  about?: BilingualText
  routes?: UpcomingGameEventRoute[]
}

export interface UpcomingGameEvent {
  id: string
  title: BilingualText
  start: string
  end?: string
  thumbnail: UpcomingGameEventThumbnail
  detail?: UpcomingGameEventDetail
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

const EN_MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** 节庆详情日期（游戏日 08:00 HKT 起算）。 */
export function formatUpcomingGameEventDetailDate(date: string, locale: Locale): string {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  if (locale === 'en') {
    return `${EN_MONTH_SHORT[month - 1] ?? month} ${day}, ${year} 08:00 HKT`
  }
  return `${year}年${month}月${day}日 08:00（HKT）`
}

export function getUpcomingGameEventById(id: string): UpcomingGameEvent | undefined {
  return events.find((event) => event.id === id)
}

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
