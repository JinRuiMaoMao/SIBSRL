import {
  buildDailyChallengeFromScheduleDay,
  todayHktDateString,
  type DailyChallengeInfo,
} from './dailyChallenge'
import type { DailyChallengeScheduleDay } from './dailyChallengeSchedule'

type RawDailyChallengeRecord = Partial<DailyChallengeScheduleDay> & {
  route?: unknown
  routeNumber?: unknown
  type?: unknown
  latest?: unknown
  dailyChallenge?: unknown
}

declare global {
  interface Window {
    DAILY_CHALLENGE_API_URL?: string
    DAILY_CHALLENGE_POLL_MS?: string | number
  }
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function boolOrFalse(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function readMetaContent(name: string): string | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || null
}

export function getDailyChallengeApiUrl(): string | null {
  return (
    window.DAILY_CHALLENGE_API_URL?.trim() ||
    readMetaContent('daily-challenge-api') ||
    import.meta.env.VITE_DAILY_CHALLENGE_API_URL?.trim() ||
    null
  )
}

export function getDailyChallengePollIntervalMs(): number {
  const raw =
    window.DAILY_CHALLENGE_POLL_MS ??
    readMetaContent('daily-challenge-poll-ms') ??
    import.meta.env.VITE_DAILY_CHALLENGE_POLL_MS
  const parsed = Number(raw ?? 5000)
  if (!Number.isFinite(parsed) || parsed <= 0) return 5000
  return Math.max(1000, parsed)
}

function unwrapRecord(payload: unknown): RawDailyChallengeRecord | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as RawDailyChallengeRecord
  const nested = record.latest ?? record.dailyChallenge
  if (nested && typeof nested === 'object') return nested as RawDailyChallengeRecord
  return record
}

function normalizeApiRecord(payload: unknown): DailyChallengeScheduleDay | null {
  const record = unwrapRecord(payload)
  if (!record) return null

  const routeCode =
    stringOrNull(record.routeCode) ??
    stringOrNull(record.routeNumber) ??
    stringOrNull(record.route)
  const event =
    stringOrNull(record.event) ??
    stringOrNull(record.type) ??
    (routeCode ? 'Daily Challenge' : null)

  if (!event) return null

  return {
    date: stringOrNull(record.date) ?? todayHktDateString(),
    event,
    routeCode,
    race: boolOrFalse(record.race),
  }
}

export async function fetchLiveDailyChallenge(
  signal?: AbortSignal,
): Promise<DailyChallengeInfo | null> {
  const apiUrl = getDailyChallengeApiUrl()
  if (!apiUrl) return null

  const response = await fetch(apiUrl, {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return null

  const record = normalizeApiRecord(await response.json())
  if (!record || record.date !== todayHktDateString()) return null

  return {
    ...buildDailyChallengeFromScheduleDay(record),
    fromSchedule: false,
  }
}

export function getDailyChallengeHistoryApiUrl(): string | null {
  const latestUrl = getDailyChallengeApiUrl()
  if (!latestUrl) return null
  if (latestUrl.includes('/latest')) {
    return latestUrl.replace(/\/latest\/?$/, '/history')
  }
  const trimmed = latestUrl.replace(/\/$/, '')
  return `${trimmed}/history`
}

export async function fetchDailyChallengeHistory(
  signal?: AbortSignal,
): Promise<DailyChallengeScheduleDay[]> {
  const apiUrl = getDailyChallengeHistoryApiUrl()
  if (!apiUrl) return []

  try {
    const response = await fetch(apiUrl, {
      signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return []

    const payload = (await response.json()) as {
      latest?: unknown
      history?: unknown[]
    }
    const records = [payload.latest, ...(payload.history ?? [])]
    const days: DailyChallengeScheduleDay[] = []
    const seenDates = new Set<string>()

    for (const record of records) {
      const day = normalizeApiRecord(record)
      if (!day || seenDates.has(day.date)) continue
      seenDates.add(day.date)
      days.push(day)
    }

    return days
  } catch {
    return []
  }
}
