/** MM-DD annual cycle helpers (HKT game-day dates). */

export function parseMonthDay(value: string): { month: number; day: number } {
  const parts = value.split('-')
  if (parts.length === 3) {
    return { month: Number(parts[1]), day: Number(parts[2]) }
  }
  return { month: Number(parts[0]), day: Number(parts[1]) }
}

export function monthDayValue(month: number, day: number): number {
  return month * 100 + day
}

export function monthDayFromDate(date: string): number {
  const [, month, day] = date.split('-').map(Number)
  return monthDayValue(month, day)
}

const pad2 = (value: number) => String(value).padStart(2, '0')

export function formatGameDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Whether month-day falls in [startMd, endMd], inclusive; supports Dec→Jan wrap. */
export function isMonthDayInWindow(todayMd: number, startMd: string, endMd: string): boolean {
  const start = parseMonthDay(startMd)
  const end = parseMonthDay(endMd)
  const startValue = monthDayValue(start.month, start.day)
  const endValue = monthDayValue(end.month, end.day)
  if (startValue <= endValue) {
    return todayMd >= startValue && todayMd <= endValue
  }
  return todayMd >= startValue || todayMd <= endValue
}

/** Resolve YYYY-MM-DD bounds for the occurrence containing `today` (must be in window). */
export function resolveOccurrenceDates(
  today: string,
  startMd: string,
  endMd: string,
): { start: string; end: string } | null {
  const todayMd = monthDayFromDate(today)
  if (!isMonthDayInWindow(todayMd, startMd, endMd)) return null

  const [year] = today.split('-').map(Number)
  const start = parseMonthDay(startMd)
  const end = parseMonthDay(endMd)
  const startValue = monthDayValue(start.month, start.day)
  const endValue = monthDayValue(end.month, end.day)

  let startYear = year
  let endYear = year
  if (startValue > endValue) {
    if (todayMd <= endValue) {
      startYear = year - 1
      endYear = year
    } else {
      startYear = year
      endYear = year + 1
    }
  }

  return {
    start: formatGameDate(startYear, start.month, start.day),
    end: formatGameDate(endYear, end.month, end.day),
  }
}

/** Next occurrence start (YYYY-MM-DD) on or after today when not active; current start when active. */
export function getNextOccurrenceStart(today: string, startMd: string, endMd: string): string {
  const todayMd = monthDayFromDate(today)
  if (isMonthDayInWindow(todayMd, startMd, endMd)) {
    return resolveOccurrenceDates(today, startMd, endMd)!.start
  }

  const [year] = today.split('-').map(Number)
  const start = parseMonthDay(startMd)
  const startValue = monthDayValue(start.month, start.day)
  const occurrenceYear = todayMd < startValue ? year : year + 1
  return formatGameDate(occurrenceYear, start.month, start.day)
}

export function resolveOccurrenceDatesFromStart(
  occurrenceStart: string,
  startMd: string,
  endMd: string,
): { start: string; end: string } {
  return resolveOccurrenceDates(occurrenceStart, startMd, endMd) ?? {
    start: occurrenceStart,
    end: occurrenceStart,
  }
}
