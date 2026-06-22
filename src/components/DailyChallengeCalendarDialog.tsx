import { useEffect, useMemo, useState } from 'react'
import { lockPageScroll } from '../utils/pageScrollLock'
import { buildDailyChallengeFromScheduleDay } from '../data/dailyChallenge'
import {
  buildMonthCalendarCells,
  CALENDAR_EARLIEST_MONTH,
  clampScheduleMonthKey,
  compareScheduleMonthKeys,
  emptyScheduleForMonth,
  formatScheduleMonthOption,
  listScheduleYears,
  listSelectableMonthsForYear,
  parseScheduleMonthKey,
  resolveInitialCalendarMonth,
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

function CalendarDayCell({
  date,
  day,
  isToday,
  locale,
  emptyLabel,
  onSelectDay,
}: {
  date: string
  day: DailyChallengeScheduleDay | null
  isToday: boolean
  locale: ReturnType<typeof useLocale>['locale']
  emptyLabel: string
  onSelectDay?: (day: DailyChallengeScheduleDay) => void
}) {
  const challenge = day?.event ? buildDailyChallengeFromScheduleDay(day) : null
  const plainEventChallenge =
    day?.event && day.race ? buildDailyChallengeFromScheduleDay({ ...day, race: false }) : null
  const eventLabel = challenge ? getPrimaryText(challenge.event, locale) : null
  const plainEventLabel = plainEventChallenge
    ? getPrimaryText(plainEventChallenge.event, locale)
    : null
  const routeCode = day?.routeCode?.trim() || null
  const hasEvent = Boolean(day?.event)
  const isRaceOnly = Boolean(day?.race && !day?.event)
  const hasData = hasEvent || isRaceOnly
  const isRace = Boolean(day?.race)
  const className = `daily-challenge-calendar-day ${isToday ? 'is-today' : ''} ${hasData ? 'has-data' : 'is-empty'} ${hasEvent && onSelectDay ? 'is-clickable' : ''}`.trim()

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
    </>
  )

  if (hasEvent && day && onSelectDay) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => onSelectDay(day)}
        aria-label={eventLabel ?? undefined}
      >
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}

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

  useEffect(() => {
    if (!open) return
    setSelectedMonthKey(resolveInitialCalendarMonth(todayDate, schedules))
  }, [open, schedules, todayDate])

  useEffect(() => {
    if (selectableMonths.length === 0) return
    if (selectableMonths.includes(selectedMonth)) return
    setSelectedMonthKey(toScheduleMonthKey(selectedYear, selectableMonths[0]!))
  }, [selectedMonth, selectedYear, selectableMonths])

  useEffect(() => {
    if (!open) return
    return lockPageScroll()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const shiftMonth = (delta: number) => {
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
            <label className="daily-challenge-calendar-nav-field">
              <span className="daily-challenge-calendar-nav-label">{t('dailyChallengeCalendarYearLabel')}</span>
              <select
                className="daily-challenge-calendar-nav-select"
                value={selectedYear}
                aria-label={t('dailyChallengeCalendarYearLabel')}
                onChange={(event) => {
                  const year = Number(event.target.value)
                  const earliest = parseScheduleMonthKey(CALENDAR_EARLIEST_MONTH)
                  const month =
                    earliest && year === earliest.year
                      ? Math.max(selectedMonth, earliest.month)
                      : selectedMonth
                  setSelectedMonthKey(clampScheduleMonthKey(toScheduleMonthKey(year, month)))
                }}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {isChineseLocale(locale) ? `${year}年` : year}
                  </option>
                ))}
              </select>
            </label>

            <label className="daily-challenge-calendar-nav-field">
              <span className="daily-challenge-calendar-nav-label">{t('dailyChallengeCalendarMonthLabel')}</span>
              <select
                className="daily-challenge-calendar-nav-select"
                value={selectedMonth}
                aria-label={t('dailyChallengeCalendarMonthLabel')}
                onChange={(event) => {
                  const month = Number(event.target.value)
                  setSelectedMonthKey(toScheduleMonthKey(selectedYear, month))
                }}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            className="daily-challenge-calendar-nav-btn"
            onClick={() => shiftMonth(1)}
            aria-label={t('dailyChallengeCalendarNextMonth')}
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
          <div className="daily-challenge-calendar-grid">
            {calendarCells.map((cell, index) =>
              cell.date ? (
                <CalendarDayCell
                  key={cell.date}
                  date={cell.date}
                  day={cell.day}
                  isToday={cell.date === todayDate}
                  locale={locale}
                  emptyLabel={t('dailyChallengeCalendarNoData')}
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
  )
}
