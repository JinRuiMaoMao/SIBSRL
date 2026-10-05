import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { lockPageScroll } from '../utils/pageScrollLock'
import {
  buildDailyChallengeFromScheduleDay,
  formatDailyChallengeCalendarRouteCode,
} from '../data/dailyChallenge'
import {
  collectMonthSearchMatchDates,
  collectScheduleDays,
  countDailyChallengeSearchByPeriod,
} from '../utils/dailyChallengeCalendarSearch'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { DailyChallengeCalendarNavPicker } from './DailyChallengeCalendarNavPicker'
import {
  buildMonthCalendarCells,
  CALENDAR_EARLIEST_MONTH,
  CALENDAR_LATEST_MONTH,
  clampScheduleMonthKey,
  compareScheduleMonthKeys,
  emptyScheduleForMonth,
  formatScheduleMonthOption,
  listScheduleYears,
  listSelectableMonthsForYear,
  parseScheduleMonthKey,
  resolveInitialCalendarMonth,
  resolveScheduleDayRace,
  toScheduleMonthKey,
  type DailyChallengeScheduleDay,
} from '../data/dailyChallengeSchedule'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { isChineseLocale } from '../i18n/types'
import { useCalendarSchedules } from '../hooks/useCalendarSchedules'

interface DailyChallengeCalendarDialogProps {
  open: boolean
  onClose: () => void
  todayDate: string
  onSelectDay?: (day: DailyChallengeScheduleDay) => void
}

function weekdayLabels(locale: ReturnType<typeof useLocale>['locale']): string[] {
  if (isChineseLocale(locale)) {
    return ['一', '二', '三', '四', '五', '六', '日']
  }
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
}

function dayNumberFromDate(date: string): number {
  return Number(date.slice(-2))
}

function RaceTagLabel({ locale }: { locale: ReturnType<typeof useLocale>['locale'] }) {
  const label = isChineseLocale(locale) ? '竞速' : 'Race'
  return (
    <span className="daily-challenge-calendar-day-race-tag">
      [<span className="daily-challenge-calendar-day-race-label">{label}</span>]
    </span>
  )
}

const CalendarDayCell = memo(function CalendarDayCell({
  date,
  day,
  isToday,
  isSearchDimmed,
  locale,
  emptyLabel,
  onSelectDay,
}: {
  date: string
  day: DailyChallengeScheduleDay | null
  isToday: boolean
  isSearchDimmed: boolean
  locale: ReturnType<typeof useLocale>['locale']
  emptyLabel: string
  onSelectDay?: (day: DailyChallengeScheduleDay) => void
}) {
  const dayRace = day ? resolveScheduleDayRace(day) : false
  const eventChallenge = useMemo(
    () => (day?.event ? buildDailyChallengeFromScheduleDay(day) : null),
    [day],
  )
  const plainEventChallenge = useMemo(
    () =>
      day?.event && dayRace
        ? buildDailyChallengeFromScheduleDay(day, { omitEventRacePrefix: true })
        : null,
    [day, dayRace],
  )
  const eventLabel = eventChallenge ? getPrimaryText(eventChallenge.event, locale) : null
  const plainEventLabel = plainEventChallenge
    ? getPrimaryText(plainEventChallenge.event, locale)
    : null
  const routeCode = formatDailyChallengeCalendarRouteCode(day?.routeCode, day?.event)
  const hasEvent = Boolean(day?.event)
  const isRaceOnly = Boolean(dayRace && !day?.event)
  const hasData = hasEvent || isRaceOnly
  const isRace = dayRace
  const className =
    `daily-challenge-calendar-day ${isToday ? 'is-today' : ''} ${isSearchDimmed ? 'is-search-dimmed' : ''} ${hasData ? 'has-data' : 'is-empty'} ${hasEvent && onSelectDay ? 'is-clickable' : ''}`.trim()

  const inner = (
    <>
      <span
        className={`daily-challenge-calendar-day-number ${isRace ? 'is-race' : ''}`.trim()}
      >
        {dayNumberFromDate(date)}
      </span>
      {hasData ? (
        <>
          {routeCode ? <span className="daily-challenge-calendar-day-route">{routeCode}</span> : null}
          {hasEvent && eventLabel ? (
            <span className="daily-challenge-calendar-day-event" title={eventLabel}>
              {isRace ? (
                <>
                  <RaceTagLabel locale={locale} />
                  {plainEventLabel ? ` ${plainEventLabel}` : null}
                </>
              ) : (
                eventLabel
              )}
            </span>
          ) : isRaceOnly ? (
            <span className="daily-challenge-calendar-day-event">
              <RaceTagLabel locale={locale} />
            </span>
          ) : null}
        </>
      ) : (
        <span className="daily-challenge-calendar-day-empty">{emptyLabel}</span>
      )}
      {isSearchDimmed ? (
        <span className="daily-challenge-calendar-day-dim" aria-hidden />
      ) : null}
    </>
  )

  if (hasEvent && day && onSelectDay) {
    return (
      <button
        type="button"
        id={`daily-challenge-calendar-day-${date}`}
        className={className}
        onClick={() => onSelectDay(day)}
        aria-label={eventLabel ?? undefined}
      >
        {inner}
      </button>
    )
  }

  return (
    <div id={`daily-challenge-calendar-day-${date}`} className={className}>
      {inner}
    </div>
  )
})

export function DailyChallengeCalendarDialog({
  open,
  onClose,
  todayDate,
  onSelectDay,
}: DailyChallengeCalendarDialogProps) {
  const { locale, t } = useLocale()
  const { schedules, hasLiveOverlay } = useCalendarSchedules()
  const weekdays = useMemo(() => weekdayLabels(locale), [locale])
  const years = useMemo(() => listScheduleYears(schedules), [schedules])
  const [selectedMonthKey, setSelectedMonthKey] = useState(() =>
    resolveInitialCalendarMonth(todayDate, schedules),
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [openNavPicker, setOpenNavPicker] = useState<'year' | 'month' | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const wasOpenRef = useRef(false)

  const selectedParsed = parseScheduleMonthKey(selectedMonthKey)
  const selectedYear = selectedParsed?.year ?? years[0] ?? Number(todayDate.slice(0, 4))
  const selectedMonth = selectedParsed?.month ?? Number(todayDate.slice(5, 7))

  const activeSchedule = schedules.find((schedule) => schedule.month === selectedMonthKey)
  const displaySchedule = activeSchedule ?? emptyScheduleForMonth(selectedMonthKey)
  const calendarCells = useMemo(
    () => buildMonthCalendarCells(displaySchedule),
    [displaySchedule],
  )

  const selectableMonths = useMemo(
    () => listSelectableMonthsForYear(selectedYear),
    [selectedYear],
  )
  const monthOptions = useMemo(
    () =>
      selectableMonths.map((month) => ({
        value: month,
        label: formatScheduleMonthOption(toScheduleMonthKey(selectedYear, month), locale),
      })),
    [locale, selectableMonths, selectedYear],
  )
  const isAtEarliestMonth = compareScheduleMonthKeys(selectedMonthKey, CALENDAR_EARLIEST_MONTH) <= 0
  const isAtLatestMonth = compareScheduleMonthKeys(selectedMonthKey, CALENDAR_LATEST_MONTH) >= 0
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 120)
  const searchActive = debouncedSearchQuery.trim().length > 0
  const searchPending =
    searchQuery.trim().length > 0 && debouncedSearchQuery.trim() !== searchQuery.trim()
  const allScheduleDays = useMemo(() => collectScheduleDays(schedules), [schedules])
  const searchMatchDates = useMemo(
    () =>
      collectMonthSearchMatchDates(
        calendarCells.map((cell) => cell.day),
        debouncedSearchQuery,
      ),
    [calendarCells, debouncedSearchQuery],
  )
  const searchPeriodCounts = useMemo(
    () => countDailyChallengeSearchByPeriod(allScheduleDays, debouncedSearchQuery),
    [allScheduleDays, debouncedSearchQuery],
  )
  const searchHitCount = searchPeriodCounts.total
  const currentMonthSearchCount = searchPeriodCounts.byMonthKey.get(selectedMonthKey) ?? 0
  const currentYearSearchCount = searchPeriodCounts.byYear.get(selectedYear) ?? 0
  const yearPickerOptions = useMemo(
    () =>
      years.map((year) => ({
        value: year,
        label: isChineseLocale(locale) ? `${year}年` : String(year),
        badge: searchActive ? (searchPeriodCounts.byYear.get(year) ?? 0) : undefined,
      })),
    [locale, searchActive, searchPeriodCounts.byYear, years],
  )
  const monthPickerOptions = useMemo(
    () =>
      monthOptions.map((option) => ({
        value: option.value,
        label: option.label,
        badge: searchActive
          ? (searchPeriodCounts.byMonthKey.get(toScheduleMonthKey(selectedYear, option.value)) ?? 0)
          : undefined,
      })),
    [monthOptions, searchActive, searchPeriodCounts.byMonthKey, selectedYear],
  )

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true
    setSelectedMonthKey(resolveInitialCalendarMonth(todayDate, schedules))
    setSearchQuery('')
    setOpenNavPicker(null)
  }, [open, schedules, todayDate])

  useEffect(() => {
    if (selectableMonths.length === 0) return
    if (selectableMonths.includes(selectedMonth)) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setSelectedMonthKey(toScheduleMonthKey(selectedYear, selectableMonths[0]!))
    })
    return () => {
      cancelled = true
    }
  }, [selectedMonth, selectedYear, selectableMonths])

  useEffect(() => {
    if (!open) return
    return lockPageScroll()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (openNavPicker) {
        setOpenNavPicker(null)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, openNavPicker])

  const shiftMonth = (delta: number) => {
    setOpenNavPicker(null)
    setSelectedMonthKey((current) => {
      const parsed = parseScheduleMonthKey(current)
      if (!parsed) return current
      let year = parsed.year
      let month = parsed.month + delta
      while (month < 1) {
        month += 12
        year -= 1
      }
      while (month > 12) {
        month -= 12
        year += 1
      }
      if (years.length > 0 && !years.includes(year)) {
        year = delta < 0 ? years[0]! : years[years.length - 1]!
      }
      return clampScheduleMonthKey(toScheduleMonthKey(year, month))
    })
  }

  if (!open) return null

  return (
    <div className="daily-challenge-calendar-root">
      <button
        type="button"
        className="daily-challenge-calendar-backdrop"
        aria-label={t('dailyChallengeCalendarClose')}
        onClick={onClose}
      />
      <div
        className="daily-challenge-calendar-panel sibs-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-challenge-calendar-title"
      >
        <span className="sibs-liquid-glass-surface" aria-hidden />
        <div className="daily-challenge-calendar-header">
          <h2 id="daily-challenge-calendar-title" className="daily-challenge-calendar-title">
            {t('dailyChallengeCalendarTitle')}
          </h2>
          <button
            type="button"
            className="daily-challenge-calendar-close"
            onClick={onClose}
            aria-label={t('dailyChallengeCalendarClose')}
          >
            ×
          </button>
        </div>

        <p className="daily-challenge-calendar-note">{t('dailyChallengeScheduleNote')}</p>
        {hasLiveOverlay ? (
          <p className="daily-challenge-calendar-note daily-challenge-calendar-note--live">
            {t('dailyChallengeCalendarLiveNote')}
          </p>
        ) : null}
        <p className="daily-challenge-calendar-legend">
          <span className="daily-challenge-calendar-legend-race-demo" aria-hidden>
            <span className="daily-challenge-calendar-day-number is-race">6</span>
            <RaceTagLabel locale={locale} />
          </span>
          {t('dailyChallengeCalendarRaceLegend')}
        </p>

        <div className="daily-challenge-calendar-route-search">
          <label className="daily-challenge-calendar-route-search-field" htmlFor="daily-challenge-calendar-search">
            <span className="daily-challenge-calendar-route-search-label">
              {t('dailyChallengeCalendarSearchLabel')}
            </span>
            <input
              ref={searchInputRef}
              id="daily-challenge-calendar-search"
              className="daily-challenge-calendar-route-search-input"
              type="search"
              value={searchQuery}
              placeholder={t('dailyChallengeCalendarSearchPlaceholder')}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          {searchQuery.trim() ? (
            <p
              className={`daily-challenge-calendar-route-search-hint ${!searchPending && searchHitCount === 0 ? 'is-empty' : 'is-active'}`.trim()}
              role="status"
            >
              {searchPending
                ? t('dailyChallengeCalendarSearchPending')
                : searchHitCount === 0
                  ? t('dailyChallengeCalendarSearchEmpty')
                  : t('dailyChallengeCalendarSearchCountDetail', {
                      count: searchHitCount,
                      monthCount: currentMonthSearchCount,
                      year: selectedYear,
                      yearCount: currentYearSearchCount,
                    })}
            </p>
          ) : (
            <p className="daily-challenge-calendar-route-search-hint">
              {t('dailyChallengeCalendarSearchHint')}
            </p>
          )}
        </div>

        <div className="daily-challenge-calendar-main">
          <div className="daily-challenge-calendar-nav">
          <button
            type="button"
            className="daily-challenge-calendar-nav-btn"
            onClick={() => shiftMonth(-1)}
            aria-label={t('dailyChallengeCalendarPrevMonth')}
            disabled={isAtEarliestMonth}
          >
            ‹
          </button>

          <div className="daily-challenge-calendar-nav-selects">
            <DailyChallengeCalendarNavPicker
              label={t('dailyChallengeCalendarYearLabel')}
              value={selectedYear}
              options={yearPickerOptions}
              ariaLabel={t('dailyChallengeCalendarYearLabel')}
              open={openNavPicker === 'year'}
              onOpenChange={(open) => setOpenNavPicker(open ? 'year' : null)}
              onChange={(year) => {
                const earliest = parseScheduleMonthKey(CALENDAR_EARLIEST_MONTH)
                const latest = parseScheduleMonthKey(CALENDAR_LATEST_MONTH)
                const month =
                  earliest && year === earliest.year
                    ? Math.max(selectedMonth, earliest.month)
                    : latest && year === latest.year
                      ? Math.min(selectedMonth, latest.month)
                      : selectedMonth
                setSelectedMonthKey(clampScheduleMonthKey(toScheduleMonthKey(year, month)))
              }}
            />

            <DailyChallengeCalendarNavPicker
              label={t('dailyChallengeCalendarMonthLabel')}
              value={selectedMonth}
              options={monthPickerOptions}
              ariaLabel={t('dailyChallengeCalendarMonthLabel')}
              open={openNavPicker === 'month'}
              onOpenChange={(open) => setOpenNavPicker(open ? 'month' : null)}
              onChange={(month) => {
                setSelectedMonthKey(toScheduleMonthKey(selectedYear, month))
              }}
            />
          </div>

          <button
            type="button"
            className="daily-challenge-calendar-nav-btn"
            onClick={() => shiftMonth(1)}
            aria-label={t('dailyChallengeCalendarNextMonth')}
            disabled={isAtLatestMonth}
          >
            ›
          </button>
        </div>

        {!activeSchedule ? (
          <p className="daily-challenge-calendar-note daily-challenge-calendar-note--empty-month">
            {t('dailyChallengeCalendarNoSchedule')}
          </p>
        ) : null}

        <section className="daily-challenge-calendar-month">
          <div className="daily-challenge-calendar-weekdays" aria-hidden>
            {weekdays.map((label) => (
              <span key={label} className="daily-challenge-calendar-weekday">
                {label}
              </span>
            ))}
          </div>
          <div
            className={`daily-challenge-calendar-grid ${searchActive ? 'is-search-active' : ''}`.trim()}
          >
            {calendarCells.map((cell, index) =>
              cell.date ? (
                <CalendarDayCell
                  key={cell.date}
                  date={cell.date}
                  day={cell.day}
                  isToday={cell.date === todayDate}
                  isSearchDimmed={searchActive && !searchMatchDates.has(cell.date)}
                  locale={locale}
                  emptyLabel={
                    cell.date < todayDate
                      ? t('dailyChallengeCalendarMissingData')
                      : t('dailyChallengeCalendarNoData')
                  }
                  onSelectDay={onSelectDay}
                />
              ) : (
                <div
                  key={`pad-${selectedMonthKey}-${index}`}
                  className="daily-challenge-calendar-day is-pad"
                  aria-hidden
                />
              ),
            )}
          </div>
        </section>
        </div>
      </div>
    </div>
  )
}
