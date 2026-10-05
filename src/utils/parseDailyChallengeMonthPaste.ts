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

const ROUTE_CODE_RE = /^(?:PH\d+|[A-Z]{0,3}\d{1,4}[A-Z0-9#*%_-]*)$/i

function stripDiscordEmoji(value: string): string {
  return value
    .replace(/<a?:\w+:\d+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripDiscordNotes(value: string): string {
  return value
    .replace(/\(\s*drify\b[^)]*\)/gi, '')
    .replace(/\(\s*but\b[^)]*\)/gi, '')
    .replace(/\s+\+\s+drify\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function extractMonthFromTitle(line: string): number | null {
  const tildeMatch = line.match(/~\s*(\w+)\s+daily\s+challenge\s*~/i)
  if (tildeMatch?.[1]) {
    return MONTH_NAMES[tildeMatch[1].toLowerCase()] ?? null
  }

  const plainMatch = line.match(/^(\w+)\s+daily\s+challenge\s*:?\s*$/i)
  if (plainMatch?.[1]) {
    return MONTH_NAMES[plainMatch[1].toLowerCase()] ?? null
  }

  return null
}

function looksLikeRouteCode(value: string): boolean {
  const code = value.trim().toUpperCase()
  if (!code) return false
  if (code.length === 1) return false
  return ROUTE_CODE_RE.test(code)
}

function normalizeEventAndRoute(
  event: string,
  routeCode: string | null,
): { event: string; routeCode: string | null } {
  let e = event.trim().replace(/\s+/g, ' ')
  let route = routeCode?.toUpperCase() ?? null

  if (/^Rare Appearance\s+PH\b/i.test(e) || /^Rare Appearance\s+x\s+Private Hire/i.test(e)) {
    return {
      event: 'Rare Appearance x Private Hire',
      routeCode: route ?? 'PH1',
    }
  }

  if (/^PH\b/i.test(e) || /^Private Hire\b/i.test(e)) {
    const phRoute = e.match(/\((PH\d+)\)/i)?.[1] ?? (route?.startsWith('PH') ? route : null)
    return {
      event: 'Private Hire',
      routeCode: phRoute?.toUpperCase() ?? route,
    }
  }

  if (/^Marathon\s+R(\d+)/i.test(e)) {
    const shuttleRoute = e.match(/^Marathon\s+R(\d+)/i)?.[1]
    return {
      event: 'Marathon Shuttle',
      routeCode: shuttleRoute ? `R${shuttleRoute}` : route,
    }
  }

  if (/^Marathon\s*\(\s*R(\d+)/i.test(e) || (route?.startsWith('R') && /^Marathon\b/i.test(e))) {
    return {
      event: 'Marathon Shuttle',
      routeCode: route,
    }
  }

  if (/^Marathon\s+Closure/i.test(e)) {
    const n271 = e.match(/N271\s*\(\s*(N171WM)\s*\)/i)
    if (n271?.[1]) {
      return { event: 'Marathon Road Closure', routeCode: n271[1].toUpperCase() }
    }
    const bare = e.match(/^Marathon\s+Closure\s+(\S+)/i)?.[1]
    const bareRoute = bare?.replace(/[(:].*$/, '').toUpperCase()
    if (bareRoute && looksLikeRouteCode(bareRoute)) {
      return { event: 'Marathon Road Closure', routeCode: bareRoute }
    }
    return { event: 'Marathon Road Closure', routeCode: route }
  }

  if (/^Marathon\b/i.test(e)) {
    return {
      event: 'Marathon Road Closure',
      routeCode: route,
    }
  }

  return { event: e, routeCode: route }
}

function extractRouteFromTail(value: string): { event: string; routeCode: string | null } {
  const trimmed = stripDiscordNotes(value.trim())

  const n271Match = trimmed.match(/^Marathon\s+Closure\s+N271\s*\(\s*(N171WM)\s*\)/i)
  if (n271Match?.[1]) {
    return { event: 'Marathon Road Closure', routeCode: n271Match[1].toUpperCase() }
  }

  const marathonClosureMatch = trimmed.match(/^Marathon\s+Closure\s+(\S+)/i)
  if (marathonClosureMatch?.[1]) {
    const code = marathonClosureMatch[1].replace(/[(:].*$/, '').toUpperCase()
    if (looksLikeRouteCode(code)) {
      return { event: 'Marathon Road Closure', routeCode: code }
    }
  }

  const marathonShuttleMatch = trimmed.match(/^Marathon\s+R(\d+)/i)
  if (marathonShuttleMatch?.[1]) {
    return { event: 'Marathon Shuttle', routeCode: `R${marathonShuttleMatch[1]}` }
  }

  const parenMatches = [...trimmed.matchAll(/\(([A-Z0-9#*%_\-]+)\)/gi)]
  for (let index = parenMatches.length - 1; index >= 0; index -= 1) {
    const match = parenMatches[index]
    const code = match[1]?.toUpperCase()
    if (!code || !looksLikeRouteCode(code) || match.index == null) continue
    return normalizeEventAndRoute(trimmed.slice(0, match.index).trim(), code)
  }

  return normalizeEventAndRoute(trimmed, null)
}

function parseRaceAndEvent(value: string): { event: string; race: boolean } {
  let rest = stripDiscordNotes(value.trim())
  let race = false

  if (/^\(\s*race\s*\)\s*/i.test(rest)) {
    race = true
    rest = rest.replace(/^\(\s*race\s*\)\s*/i, '').trim()
  }
  if (/^\[?\s*race\s*\]?\s*/i.test(rest)) {
    race = true
    rest = rest.replace(/^\[?\s*race\s*\]?\s*/i, '').trim()
  }

  return { event: rest, race }
}

function parseDayLine(line: string): {
  month: number | null
  day: number
  content: string
} | null {
  const slashMatch = line.match(/^(\d{1,2})\/(\d{1,2})\s*:\s*(.*)$/i)
  if (slashMatch) {
    return {
      month: Number(slashMatch[1]),
      day: Number(slashMatch[2]),
      content: slashMatch[3] ?? '',
    }
  }

  const dayOnlyMatch = line.match(/^(\d{1,2})\s*:\s*(.*)$/i)
  if (dayOnlyMatch) {
    return {
      month: null,
      day: Number(dayOnlyMatch[1]),
      content: dayOnlyMatch[2] ?? '',
    }
  }

  return null
}

export function parseDailyChallengeMonthPaste(
  raw: string,
  options: { year?: number } = {},
): ParseMonthPasteResult {
  const defaultYear = Number(todayHktDateString().slice(0, 4))
  let year = options.year ?? defaultYear
  let month = Number(todayHktDateString().slice(5, 7))
  let titleMonth: number | null = null
  let skippedEmpty = 0
  const days: ParsedDailyChallengeDay[] = []

  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = stripDiscordEmoji(lineRaw)
    if (!line) continue

    const parsedTitleMonth = extractMonthFromTitle(line)
    if (parsedTitleMonth != null) {
      titleMonth = parsedTitleMonth
      month = parsedTitleMonth
      continue
    }

    const dayLine = parseDayLine(line)
    if (!dayLine) continue

    const content = stripDiscordNotes(stripDiscordEmoji(dayLine.content))
    const resolvedMonth =
      dayLine.month != null && dayLine.month >= 1 && dayLine.month <= 12
        ? dayLine.month
        : titleMonth ?? month

    if (dayLine.month != null && dayLine.month >= 1 && dayLine.month <= 12) {
      month = dayLine.month
    }

    if (!content) {
      skippedEmpty += 1
      continue
    }

    if (dayLine.day < 1 || dayLine.day > 31) {
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
      date: `${year}-${pad2(resolvedMonth)}-${pad2(dayLine.day)}`,
      event,
      routeCode,
      race,
    })
  }

  return {
    year,
    month: titleMonth ?? month,
    monthKey: `${year}-${pad2(titleMonth ?? month)}`,
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
      found
        ? {
            date: found.date,
            event: found.event,
            routeCode: found.routeCode ?? '',
            race: found.race,
          }
        : {
            date,
            event: '',
            routeCode: '',
            race: false,
          },
    )
  }

  return rows
}
