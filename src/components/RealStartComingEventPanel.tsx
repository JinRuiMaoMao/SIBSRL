import { useMemo, type MouseEvent } from 'react'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import {
  formatComingEventDateRange,
  getUpcomingGameEventThumbnailUrl,
  type UpcomingGameEventView,
} from '../data/upcomingGameEvents'
import { isComingEventCountdownUrgent } from '../utils/realStartRightPanel'

interface RealStartComingEventPanelProps {
  event: UpcomingGameEventView
  onOpen: () => void
}

function formatCountdownLabel(
  event: UpcomingGameEventView,
  t: (key: MessageKey, params?: Record<string, number>) => string,
): string {
  if (event.relativeKey === 'upcomingEventActive') return t('realStartEventLive')
  if (event.relativeKey === 'upcomingEventToday') return t('upcomingEventToday')
  if (event.relativeKey === 'upcomingEventInDays') {
    return t('upcomingEventInDays', { count: event.relativeCount ?? 0 })
  }
  if (event.relativeKey === 'upcomingEventInMonths') {
    return t('upcomingEventInMonths', { count: event.relativeCount ?? 0 })
  }
  return t('upcomingEventToday')
}

export function RealStartComingEventPanel({ event, onOpen }: RealStartComingEventPanelProps) {
  const { locale, t } = useLocale()
  const title = getPrimaryText(event.title, locale)
  const dateRange = useMemo(() => formatComingEventDateRange(event, locale), [event, locale])
  const isLive = event.relativeKey === 'upcomingEventActive'
  const countdownLabel = formatCountdownLabel(event, t)
  const urgent = isComingEventCountdownUrgent(event)

  const handleClick = (clickEvent: MouseEvent<HTMLButtonElement>) => {
    clickEvent.preventDefault()
    onOpen()
  }

  return (
    <button
      type="button"
      className="real-start-r-panel real-start-coming-event"
      onClick={handleClick}
      aria-label={title}
    >
      <div className="real-start-coming-event-date">
        <span className="real-start-coming-event-date-icon" aria-hidden="true">
          📅
        </span>
        <span className="real-start-coming-event-date-text">{dateRange}</span>
      </div>

      <div className="real-start-coming-event-thumb">
        <img
          className="real-start-coming-event-thumb-img"
          src={getUpcomingGameEventThumbnailUrl(event.thumbnail)}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span
          className={`real-start-coming-event-badge${isLive ? ' real-start-coming-event-badge--live' : ''}${urgent ? ' real-start-coming-event-badge--urgent' : ''}`}
        >
          {countdownLabel}
        </span>
      </div>

      <p className="real-start-coming-event-title">{title}</p>
    </button>
  )
}
