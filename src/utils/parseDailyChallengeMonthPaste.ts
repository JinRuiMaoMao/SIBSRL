import { todayHktDateString } from '../data/dailyChallenge'

export interface ParsedDailyChallengeDay {
  date: string
  event: string
  routeCode: string | null
  race: boolean
}

export interface ParseMonthPasteResult {
  year: number
  month: number
  monthKey: string
  days: ParsedDailyChallengeDay[]
  skippedEmpty: number
}

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

function stripDiscordEmoji(value: string): string {
  return value
    .replace(/<a?:\w+:\d+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function extractMonthFromTitle(line: string): number | null {
  const match = line.match(/~\s*(\w+)\s+daily\s+challenge\s*~/i)
  if (!match?.[1]) return null
  return MONTH_NAMES[match[1].toLowerCase()] ?? null
}

function extractRouteFromTail(value: string): { event: string; routeCode: string | null } {
  const trimmed = value.trim()
  const match = trimmed.match(/\(([A-Z0-9#*%_\-]+)\)\s*$/i)
  if (!match?.[1] || match.index == null) {
    return { event: trimmed, routeCode: null }
  }
  const routeCode = match[1].toUpperCase()
  const event = trimmed.slice(0, match.index).trim()
  return { event, routeCode }
}

function parseRaceAndEvent(value: string): { event: string; race: boolean } {
  let rest = value.trim()
  let race = false
  if (/^\[?\s*race\s*\]?\s*/i.test(rest)) {
    race = true
    rest = rest.replace(/^\[?\s*race\s*\]?\s*/i, '').trim()
  }
  return { event: rest, race }
}

export function parseDailyChallengeMonthPaste(
  raw: string,
  options: { year?: number } = {},
): ParseMonthPasteResult {
  const defaultYear = Number(todayHktDateString().slice(0, 4))
  let year = options.year ?? defaultYear
  let month = Number(todayHktDateString().slice(5, 7))
  let skippedEmpty = 0
  const days: ParsedDailyChallengeDay[] = []

  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = stripDiscordEmoji(lineRaw)
    if (!line) continue

    const titleMonth = extractMonthFromTitle(line)
    if (titleMonth != null) {
      month = titleMonth
      continue
    }

    const dayMatch = line.match(/^(\d{1,2})\/(\d{1,2})\s*:\s*(.*)$/i)
    if (!dayMatch) continue

    const dayNum = Number(dayMatch[1])
    const monthNum = Number(dayMatch[2])
    const content = stripDiscordEmoji(dayMatch[3] ?? '')

    if (monthNum >= 1 && monthNum <= 12) {
      month = monthNum
    }

    if (!content) {
      skippedEmpty += 1
      continue
    }

    const { race, event: eventRaw } = parseRaceAndEvent(content)
    const { event, routeCode } = extractRouteFromTail(eventRaw)
    if (!event) {
      skippedEmpty += 1
      continue
    }

    days.push({
      date: `${year}-${pad2(month)}-${pad2(dayNum)}`,
      event,
      routeCode,
      race,
    })
  }

  return {
    year,
    month,
    monthKey: `${year}-${pad2(month)}`,
    days,
    skippedEmpty,
  }
}

export function mergeParsedDaysIntoRows<T extends ParsedDailyChallengeDay>(
  rows: T[],
  parsed: ParsedDailyChallengeDay[],
): { rows: T[]; added: number; updated: number } {
  const byDate = new Map(rows.map((row) => [row.date, row]))
  let added = 0
  let updated = 0

  for (const day of parsed) {
    const existing = byDate.get(day.date)
    if (existing) {
      existing.event = day.event
      existing.routeCode = day.routeCode ?? ''
      existing.race = day.race
      updated += 1
    } else {
      const next = {
        date: day.date,
        event: day.event,
        routeCode: day.routeCode ?? '',
        race: day.race,
      } as T
      byDate.set(day.date, next)
      added += 1
    }
  }

  return {
    rows: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    added,
    updated,
  }
}

export function addCalendarDays(dateStr: string, delta: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(year, month - 1, day))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}

export function buildMonthRowSkeleton(
  monthKey: string,
  existing: ParsedDailyChallengeDay[] = [],
): ParsedDailyChallengeDay[] {
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const byDate = new Map(existing.map((row) => [row.date, row]))
  const rows: ParsedDailyChallengeDay[] = []

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${pad2(month)}-${pad2(day)}`
    const found = byDate.get(date)
    rows.push(
      found ?? {
        date,
        event: '',
        routeCode: '',
        race: false,
      },
    )
  }

  return rows
}
