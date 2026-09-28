import calendarData from '../../data/game-lunar-calendar-data.json'

/** Port of ReplicatedStorage.CommonModule.LunarDate (+ Festival) from SIBS. */

export type GameFestivalId =
  | 'ChingMing'
  | 'ChongYang'
  | 'ChineseNewYear'
  | 'NewYear'
  | 'ChristmasEve'
  | 'MidAutumn'
  | 'DragonBoat'
  | 'FTAnniversary'

export type GameEventStatus = 'Upcoming' | 'Active' | 'Concluded'

export interface SolarDate {
  year: number
  month: number
  day: number
  isLunar?: false
  isleap?: false
}

export interface LunarDateParts {
  year: number
  month: number
  day: number
  isleap?: boolean
  isLunar: true
}

export type GameDateParts = SolarDate | LunarDateParts

export interface GameFestivalDefinition {
  id: GameFestivalId
  name: string
  duration: number
  hkTime?: boolean
  /** Lunar festivals in SIBS use the lunar table keyed by UTC year, but the active window
   *  for early-year festivals can fall under the previous key once UTC year rolls over. */
  lunar?: boolean
  getDate: (year: number) => GameDateParts
}

const lunarMonthDays = calendarData.lunar_month_days
const solar11 = calendarData.solar_1_1

const lunarToSolarCache = new Map<string, SolarDate>()

function newSolar(year: number, month: number, day: number): SolarDate {
  return { year, month, day }
}

function newLunar(
  year: number,
  month: number,
  day: number,
  isleap = false,
): LunarDateParts {
  return { year, month, day, isleap, isLunar: true }
}

function solarFromInt(value: number): SolarDate {
  let count = Math.floor((10000 * value + 14780) / 3652425)
  let remainder = value - (count * 365 + Math.floor(count / 4) - Math.floor(count / 100) + Math.floor(count / 400))

  if (remainder < 0) {
    count -= 1
    remainder =
      value - (count * 365 + Math.floor(count / 4) - Math.floor(count / 100) + Math.floor(count / 400))
  }

  const monthIndex = Math.floor((100 * remainder + 52) / 3060)
  const year = count + Math.floor((monthIndex + 2) / 12)
  const month = ((monthIndex + 2) % 12) + 1
  const day = remainder - Math.floor((monthIndex * 306 + 5) / 10) + 1
  return newSolar(year, month, day)
}

function lunar2Solar(parts: LunarDateParts): SolarDate {
  const key = `${parts.year}_${parts.month}_${parts.day}_${parts.isleap ?? false}`
  const cached = lunarToSolarCache.get(key)
  if (cached) return cached

  const row = lunarMonthDays[parts.year - lunarMonthDays[0] + 1]
  const leapMonth = (row & 122880) >> 13
  let sum = 0

  const monthLimit = parts.isleap
    ? leapMonth
    : parts.month <= leapMonth || leapMonth === 0
      ? parts.month - 1
      : parts.month

  for (let i = 0; i < monthLimit; i += 1) {
    const slot = 12 - i
    sum += ((row >> slot) & 1) === 1 ? 30 : 29
  }

  const solarRow = solar11[parts.year - solar11[0] + 1]
  const solarYear = (solarRow & 2096640) >> 9
  const solarMonthBits = (solarRow & 480) >> 5
  const solarDayBits = solarRow & 31
  const monthOffset = (solarMonthBits + 9) % 12
  const yearBase = solarYear - Math.floor(monthOffset / 10)
  const dayInt =
    365 * yearBase +
    Math.floor(yearBase / 4) -
    Math.floor(yearBase / 100) +
    Math.floor(yearBase / 400) +
    Math.floor((monthOffset * 306 + 5) / 10) +
    (solarDayBits - 1) +
    (sum + parts.day) -
    1

  const result = solarFromInt(dayInt)
  lunarToSolarCache.set(key, result)
  return result
}

function getUnixTimestamp(parts: GameDateParts): number {
  const solar = parts.isLunar ? lunar2Solar(parts) : parts
  return Date.UTC(solar.year, solar.month - 1, solar.day) / 1000
}

export const GAME_FESTIVALS: Record<GameFestivalId, GameFestivalDefinition> = {
  ChingMing: {
    id: 'ChingMing',
    name: 'Tomb Sweeping Day',
    duration: 20,
    getDate: (year) => newSolar(year, 3, 28),
  },
  ChongYang: {
    id: 'ChongYang',
    name: 'Double Ninth Festival',
    duration: 20,
    lunar: true,
    getDate: (year) => newLunar(year, 9, 2),
  },
  ChineseNewYear: {
    id: 'ChineseNewYear',
    name: 'Lunar New Year',
    duration: 5,
    lunar: true,
    getDate: (year) => newLunar(year, 1, 1),
  },
  NewYear: {
    id: 'NewYear',
    name: "New Year's Eve",
    duration: 2,
    hkTime: true,
    getDate: (year) => newSolar(year, 1, 1),
  },
  ChristmasEve: {
    id: 'ChristmasEve',
    name: 'Christmas Eve',
    duration: 3,
    getDate: (year) => newSolar(year, 12, 24),
  },
  MidAutumn: {
    id: 'MidAutumn',
    name: 'Mid-Autumn Festival',
    duration: 3,
    lunar: true,
    getDate: (year) => newLunar(year, 8, 15),
  },
  DragonBoat: {
    id: 'DragonBoat',
    name: 'Dragon Boat Festival',
    duration: 3,
    lunar: true,
    getDate: (year) => newLunar(year, 5, 5),
  },
  FTAnniversary: {
    id: 'FTAnniversary',
    name: 'FT Anniversary',
    duration: 7,
    getDate: (year) => newSolar(year, 6, 21),
  },
}

export function getGameFestival(id: GameFestivalId): GameFestivalDefinition {
  return GAME_FESTIVALS[id]
}

function utcParts(unixSeconds: number): { year: number; month: number; day: number } {
  const date = new Date(unixSeconds * 1000)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

function resolveGregorianYear(festival: GameFestivalDefinition, at: number): number {
  if (festival.hkTime) {
    return utcParts(at + 28800).year
  }
  return utcParts(at).year
}

function getGameEventStatusForYear(
  festival: GameFestivalDefinition,
  tableYear: number,
  at: number,
): { status: GameEventStatus; boundaryUnix: number; startUnix: number; endUnix: number } {
  let sum = getUnixTimestamp(festival.getDate(tableYear))

  if (festival.hkTime) {
    sum -= 28800
  }

  const endUnix = sum + festival.duration * 86_400

  if (at < sum) {
    return { status: 'Upcoming', boundaryUnix: sum, startUnix: sum, endUnix }
  }

  if (at <= endUnix) {
    return { status: 'Active', boundaryUnix: endUnix, startUnix: sum, endUnix }
  }

  let nextSum = getUnixTimestamp(festival.getDate(tableYear + 1))
  if (festival.hkTime) {
    nextSum -= 28800
  }

  return { status: 'Concluded', boundaryUnix: nextSum, startUnix: sum, endUnix }
}

/** Mirrors LunarDate.GetEvent — `at` defaults to current UTC instant. */
export function getGameEventStatus(
  festival: GameFestivalDefinition,
  at = Math.floor(Date.now() / 1000),
): { status: GameEventStatus; boundaryUnix: number } {
  const { status, startUnix, endUnix } = getGameEventStartEndUnix(festival, at)
  if (status === 'Active') {
    return { status, boundaryUnix: endUnix }
  }
  return { status, boundaryUnix: startUnix }
}

/** Mirrors LunarDate.GetEventStartEndTime — returns UTC unix start/end for active or next window. */
export function getGameEventStartEndUnix(
  festival: GameFestivalDefinition,
  at = Math.floor(Date.now() / 1000),
): { startUnix: number; endUnix: number; active: boolean; status: GameEventStatus } {
  const gregorianYear = resolveGregorianYear(festival, at)
  const tableYears = festival.lunar ? [gregorianYear, gregorianYear - 1] : [gregorianYear]

  let activeMatch: { startUnix: number; endUnix: number } | null = null
  let nearestUpcoming: { startUnix: number; endUnix: number; boundaryUnix: number } | null = null
  let lastConcluded: { startUnix: number; endUnix: number; boundaryUnix: number } | null = null

  for (const tableYear of tableYears) {
    const result = getGameEventStatusForYear(festival, tableYear, at)
    if (result.status === 'Active') {
      activeMatch = { startUnix: result.startUnix, endUnix: result.endUnix }
      break
    }
    if (result.status === 'Upcoming') {
      if (!nearestUpcoming || result.boundaryUnix < nearestUpcoming.boundaryUnix) {
        nearestUpcoming = {
          startUnix: result.boundaryUnix,
          endUnix: result.boundaryUnix + festival.duration * 86_400,
          boundaryUnix: result.boundaryUnix,
        }
      }
      continue
    }
    if (!lastConcluded || result.boundaryUnix < lastConcluded.boundaryUnix) {
      lastConcluded = {
        startUnix: result.boundaryUnix,
        endUnix: result.boundaryUnix + festival.duration * 86_400,
        boundaryUnix: result.boundaryUnix,
      }
    }
  }

  if (activeMatch) {
    return { ...activeMatch, active: true, status: 'Active' }
  }

  const next = nearestUpcoming ?? lastConcluded!
  return {
    startUnix: next.startUnix,
    endUnix: next.endUnix,
    active: false,
    status: nearestUpcoming ? 'Upcoming' : 'Concluded',
  }
}

const hktDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong' })

/** Convert UTC unix to HKT calendar date (YYYY-MM-DD). */
export function unixToHktDateString(unixSeconds: number): string {
  return hktDateFormatter.format(new Date(unixSeconds * 1000))
}

export function addHktCalendarDays(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00+08:00`)
  return hktDateFormatter.format(new Date(base + days * 86_400_000))
}

/** Resolved occurrence bounds for route unlock / event cards (HKT game dates). */
export function resolveGameFestivalOccurrence(
  festivalId: GameFestivalId,
  todayHkt: string,
): { start: string; end: string; playableEnd: string; active: boolean } {
  const festival = getGameFestival(festivalId)
  const todayAtGameReset = Date.parse(`${todayHkt}T08:00:00+08:00`) / 1000
  const { startUnix, endUnix, active } = getGameEventStartEndUnix(festival, todayAtGameReset)

  const start = unixToHktDateString(startUnix)
  const end = unixToHktDateString(endUnix)
  const playableEnd =
    festivalId === 'FTAnniversary' ? addHktCalendarDays(start, festival.duration - 1) : end

  return { start, end, playableEnd, active }
}
