import { useEffect, useMemo } from 'react'
import { lockPageScroll } from '../utils/pageScrollLock'
import { buildDailyChallengeFromScheduleDay } from '../data/dailyChallenge'
import {
  buildMonthCalendarCells,
  formatScheduleMonthLabel,
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
  const hasData = Boolean(day?.event)
  const isRace = Boolean(day?.event && day.race)
  const className = `daily-challenge-calendar-day ${isToday ? 'is-today' : ''} ${hasData ? 'has-data is-clickable' : 'is-empty'}`.trim()

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
          {eventLabel ? (
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
          ) : null}
        </>
      ) : (
        <span className="daily-challenge-calendar-day-empty">{emptyLabel}</span>
      )}
    </>
  )

  if (hasData && day && onSelectDay) {
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

        {schedules.map((schedule) => (
          <section key={schedule.month} className="daily-challenge-calendar-month">
            <h3 className="daily-challenge-calendar-month-title">
              {formatScheduleMonthLabel(schedule.month, locale)}
            </h3>
            <div className="daily-challenge-calendar-weekdays" aria-hidden>
              {weekdays.map((label) => (
                <span key={label} className="daily-challenge-calendar-weekday">
                  {label}
                </span>
              ))}
            </div>
            <div className="daily-challenge-calendar-grid">
              {buildMonthCalendarCells(schedule).map((cell, index) =>
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
                    key={`pad-${schedule.month}-${index}`}
                    className="daily-challenge-calendar-day is-pad"
                    aria-hidden
                  />
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
