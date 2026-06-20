import { useEffect, useMemo } from 'react'
import { buildDailyChallengeFromScheduleDay } from '../data/dailyChallenge'
import {
  buildMonthCalendarCells,
  DAILY_CHALLENGE_SCHEDULES,
  formatScheduleMonthLabel,
  type DailyChallengeScheduleDay,
} from '../data/dailyChallengeSchedule'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { isChineseLocale } from '../i18n/types'

interface DailyChallengeCalendarDialogProps {
  open: boolean
  onClose: () => void
  todayDate: string
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

function CalendarDayCell({
  date,
  day,
  isToday,
  locale,
}: {
  date: string
  day: DailyChallengeScheduleDay | null
  isToday: boolean
  locale: ReturnType<typeof useLocale>['locale']
}) {
  const challenge = day?.event ? buildDailyChallengeFromScheduleDay(day) : null
  const eventLabel = challenge ? getPrimaryText(challenge.event, locale) : null
  const routeCode = day?.routeCode?.trim() || null
  const hasData = Boolean(day?.event)

  return (
    <div
      className={`daily-challenge-calendar-day ${isToday ? 'is-today' : ''} ${hasData ? 'has-data' : 'is-empty'}`.trim()}
    >
      <span className="daily-challenge-calendar-day-number">{dayNumberFromDate(date)}</span>
      {routeCode ? <span className="daily-challenge-calendar-day-route">{routeCode}</span> : null}
      {eventLabel ? (
        <span className="daily-challenge-calendar-day-event" title={eventLabel}>
          {eventLabel}
        </span>
      ) : null}
    </div>
  )
}

export function DailyChallengeCalendarDialog({
  open,
  onClose,
  todayDate,
}: DailyChallengeCalendarDialogProps) {
  const { locale, t } = useLocale()
  const weekdays = useMemo(() => weekdayLabels(locale), [locale])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
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

        {DAILY_CHALLENGE_SCHEDULES.map((schedule) => (
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
