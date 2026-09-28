import eventsJson from '../../data/upcoming-game-events.json'
import { resolveSiteAssetUrl } from '../utils/appLayoutMode'
import {
  getNextOccurrenceStart,
  isMonthDayInWindow,
  monthDayFromDate,
  resolveOccurrenceDates,
  resolveOccurrenceDatesFromStart,
} from '../utils/recurringGameCalendar'
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
  /** Annual start (MM-DD). */
  start: string
  /** Annual display end (MM-DD). */
  end?: string
  /** Last playable game day (MM-DD); defaults to end. */
  playableEnd?: string
  /** HKT instant for detail start row (default 08:00 game-day reset). */
  timeHkt?: string
  /** HKT instant for detail end row (defaults to timeHkt). */
  endTimeHkt?: string
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
  /** Resolved YYYY-MM-DD bounds for the current or next occurrence. */
  occurrenceStart: string
  occurrenceEnd?: string
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

function playableEndMonthDay(event: UpcomingGameEvent): string {
  return event.playableEnd ?? event.end ?? event.start
}

function displayEndMonthDay(event: UpcomingGameEvent): string {
  return event.end ?? event.start
}

function hktGameInstant(date: string, timeHkt: string): Date {
  const [hoursRaw, minutesRaw] = timeHkt.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)
  const hh = Number.isFinite(hours) ? String(hours).padStart(2, '0') : '08'
  const mm = Number.isFinite(minutes) ? String(minutes).padStart(2, '0') : '00'
  return new Date(`${date}T${hh}:${mm}:00+08:00`)
}

/** 节庆详情日期：数据为 HKT，展示时转为访客电脑本地时区（与游戏内一致）。 */
export function formatUpcomingGameEventDetailDate(
  date: string,
  locale: Locale,
  timeHkt = '08:00',
): string {
  const instant = hktGameInstant(date, timeHkt)
  if (Number.isNaN(instant.getTime())) return date

  const time = new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'zh-Hans', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instant)

  if (locale === 'en') {
    const month = EN_MONTH_SHORT[instant.getMonth()] ?? String(instant.getMonth() + 1)
    return `${month} ${instant.getDate()}, ${instant.getFullYear()} ${time}`
  }

  const parts = new Intl.DateTimeFormat('zh-Hans', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}年${get('month')}月${get('day')}日 ${time}`
}

export function getUpcomingGameEventById(id: string): UpcomingGameEvent | undefined {
  return events.find((event) => event.id === id)
}

function diffGameDays(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T08:00:00+08:00`)
  const toMs = Date.parse(`${to}T08:00:00+08:00`)
  return Math.ceil((toMs - fromMs) / 86_400_000)
}

function resolveEventOccurrence(
  event: UpcomingGameEvent,
  today: string,
): { occurrenceStart: string; occurrenceEnd?: string; active: boolean } {
  const playableEnd = playableEndMonthDay(event)
  const displayEnd = displayEndMonthDay(event)
  const todayMd = monthDayFromDate(today)
  const active = isMonthDayInWindow(todayMd, event.start, playableEnd)

  if (active) {
    const playable = resolveOccurrenceDates(today, event.start, playableEnd)!
    const display = resolveOccurrenceDates(today, event.start, displayEnd)!
    return {
      occurrenceStart: playable.start,
      occurrenceEnd: display.end,
      active: true,
    }
  }

  const nextStart = getNextOccurrenceStart(today, event.start, playableEnd)
  const display = resolveOccurrenceDatesFromStart(nextStart, event.start, displayEnd)
  return {
    occurrenceStart: nextStart,
    occurrenceEnd: display.end,
    active: false,
  }
}

/** 按下一届开始日排序的节庆（含进行中；每年循环）。 */
export function listUpcomingGameEvents(now = new Date()): UpcomingGameEventView[] {
  const today = todayHktDateString(now)

  return events
    .map((event): UpcomingGameEventView => {
      const { occurrenceStart, occurrenceEnd, active } = resolveEventOccurrence(event, today)

      if (active) {
        return {
          ...event,
          occurrenceStart,
          occurrenceEnd,
          relativeKey: 'upcomingEventActive',
        }
      }

      const daysUntil = diffGameDays(today, occurrenceStart)

      if (daysUntil === 0) {
        return {
          ...event,
          occurrenceStart,
          occurrenceEnd,
          relativeKey: 'upcomingEventToday',
        }
      }

      if (daysUntil < 30) {
        return {
          ...event,
          occurrenceStart,
          occurrenceEnd,
          relativeKey: 'upcomingEventInDays',
          relativeCount: daysUntil,
        }
      }

      return {
        ...event,
        occurrenceStart,
        occurrenceEnd,
        relativeKey: 'upcomingEventInMonths',
        relativeCount: Math.max(1, Math.round(daysUntil / 30)),
      }
    })
    .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart))
}
