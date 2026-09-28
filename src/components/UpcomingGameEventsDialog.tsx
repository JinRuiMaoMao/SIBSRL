import { useEffect, useMemo, useState } from 'react'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import {
  formatUpcomingGameEventDetailDate,
  getUpcomingGameEventThumbnailUrl,
  listUpcomingGameEvents,
  type UpcomingGameEventView,
} from '../data/upcomingGameEvents'
import { lockPageScroll } from '../utils/pageScrollLock'

interface UpcomingGameEventsDialogProps {
  open: boolean
  onClose: () => void
  onSelectRoute?: (routeCode: string) => void
}

function EventThumbnail({ thumbnail }: { thumbnail: UpcomingGameEventView['thumbnail'] }) {
  return (
    <div className="upcoming-game-events-card-thumb" aria-hidden>
      <img
        className="upcoming-game-events-card-thumb-img"
        src={getUpcomingGameEventThumbnailUrl(thumbnail)}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

function formatRelativeLabel(
  event: UpcomingGameEventView,
  t: (key: MessageKey, params?: Record<string, number>) => string,
): string {
  if (event.relativeKey === 'upcomingEventToday' || event.relativeKey === 'upcomingEventActive') {
    return t(event.relativeKey)
  }
  return t(event.relativeKey, { count: event.relativeCount ?? 0 })
}

function UpcomingGameEventDetailView({
  event,
  onBack,
  onClose,
  onSelectRoute,
}: {
  event: UpcomingGameEventView
  onBack: () => void
  onClose: () => void
  onSelectRoute?: (routeCode: string) => void
}) {
  const { locale, t } = useLocale()
  const detail = event.detail
  const routes = detail?.routes ?? []
  const timeHkt = event.timeHkt ?? '08:00'
  const aboutHighlight = detail?.aboutHighlight ? getPrimaryText(detail.aboutHighlight, locale) : null
  const aboutBody = detail?.about ? getPrimaryText(detail.about, locale) : null

  return (
    <div className="upcoming-game-events-detail">
      <div className="upcoming-game-events-detail-hero" aria-hidden>
        <img
          className="upcoming-game-events-detail-hero-img"
          src={getUpcomingGameEventThumbnailUrl(event.thumbnail)}
          alt=""
        />
      </div>

      <div className="upcoming-game-events-detail-nav">
        <button
          type="button"
          className="upcoming-game-events-detail-back"
          onClick={onBack}
        >
          <span className="upcoming-game-events-detail-back-icon" aria-hidden>
            ‹
          </span>
          {t('upcomingGameEventsViewOthers')}
        </button>
        <button
          type="button"
          className="upcoming-game-events-close upcoming-game-events-detail-close"
          onClick={onClose}
          aria-label={t('upcomingGameEventsClose')}
        >
          ×
        </button>
      </div>

      <div className="upcoming-game-events-detail-body">
        <h2 id="upcoming-game-event-detail-title" className="upcoming-game-events-detail-title">
          {getPrimaryText(event.title, locale)}
        </h2>

        <section className="upcoming-game-events-detail-section">
          <div className="upcoming-game-events-detail-section-head">
            <span className="upcoming-game-events-detail-section-icon" aria-hidden>
              📅
            </span>
            <h3 className="upcoming-game-events-detail-section-label">
              {t('upcomingGameEventDateLabel')}
            </h3>
          </div>
          <div className="upcoming-game-events-detail-section-content">
            <p>
              {t('upcomingGameEventDateFrom', {
                date: formatUpcomingGameEventDetailDate(event.start, locale, timeHkt),
              })}
            </p>
            {event.end ? (
              <p>
                {t('upcomingGameEventDateTo', {
                  date: formatUpcomingGameEventDetailDate(event.end, locale, timeHkt),
                })}
              </p>
            ) : null}
            <p className="upcoming-game-events-detail-date-hint">{t('upcomingGameEventDateLocalHint')}</p>
          </div>
        </section>

        {routes.length > 0 ? (
          <section className="upcoming-game-events-detail-section">
            <div className="upcoming-game-events-detail-section-head">
              <span className="upcoming-game-events-detail-section-icon" aria-hidden>
                🚌
              </span>
              <h3 className="upcoming-game-events-detail-section-label">
                {t('upcomingGameEventRoutesLabel')}
              </h3>
            </div>
            <ul className="upcoming-game-events-detail-routes">
              {routes.map((route) => {
                const endpoints = getPrimaryText(route.endpoints, locale)
                const routeButton = onSelectRoute ? (
                  <button
                    type="button"
                    className="upcoming-game-events-detail-route-code"
                    onClick={() => onSelectRoute(route.code)}
                  >
                    {route.code}
                  </button>
                ) : (
                  <span className="upcoming-game-events-detail-route-code">{route.code}</span>
                )

                return (
                  <li key={route.code} className="upcoming-game-events-detail-route">
                    {routeButton}
                    <span className="upcoming-game-events-detail-route-endpoints">{endpoints}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {aboutHighlight || aboutBody ? (
          <section className="upcoming-game-events-detail-section upcoming-game-events-detail-section--about">
            <div className="upcoming-game-events-detail-section-head">
              <span className="upcoming-game-events-detail-section-icon" aria-hidden>
                ℹ
              </span>
              <h3 className="upcoming-game-events-detail-section-label">
                {t('upcomingGameEventAboutLabel')}
              </h3>
            </div>
            <div className="upcoming-game-events-detail-about">
              <p>
                {aboutHighlight ? (
                  <strong className="upcoming-game-events-detail-about-highlight">{aboutHighlight}</strong>
                ) : null}
                {aboutBody}
              </p>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

export function UpcomingGameEventsDialog({
  open,
  onClose,
  onSelectRoute,
}: UpcomingGameEventsDialogProps) {
  const { locale, t } = useLocale()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const events = useMemo(() => (open ? listUpcomingGameEvents() : []), [open])
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  )

  useEffect(() => {
    if (!open) setSelectedEventId(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (selectedEventId) {
        setSelectedEventId(null)
        return
      }
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, selectedEventId])

  useEffect(() => {
    if (!open) return
    return lockPageScroll()
  }, [open])

  if (!open) return null

  return (
    <div className="upcoming-game-events-root">
      <button
        type="button"
        className="upcoming-game-events-backdrop"
        aria-label={t('upcomingGameEventsClose')}
        onClick={onClose}
      />
      <div
        className={`upcoming-game-events-panel sibs-scrollbar${selectedEvent ? ' upcoming-game-events-panel--detail' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={selectedEvent ? 'upcoming-game-event-detail-title' : 'upcoming-game-events-title'}
      >
        <span className="sibs-liquid-glass-surface" aria-hidden />

        {selectedEvent ? (
          <UpcomingGameEventDetailView
            event={selectedEvent}
            onBack={() => setSelectedEventId(null)}
            onClose={onClose}
            onSelectRoute={onSelectRoute}
          />
        ) : (
          <>
            <div className="upcoming-game-events-header">
              <h2 id="upcoming-game-events-title" className="upcoming-game-events-title">
                {t('routeUnlockCategoryEvents')}
              </h2>
              <button
                type="button"
                className="upcoming-game-events-close"
                onClick={onClose}
                aria-label={t('upcomingGameEventsClose')}
              >
                ×
              </button>
            </div>

            {events.length === 0 ? (
              <p className="upcoming-game-events-empty">{t('upcomingGameEventsEmpty')}</p>
            ) : (
              <ul className="upcoming-game-events-grid">
                {events.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className="upcoming-game-events-card"
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <EventThumbnail thumbnail={event.thumbnail} />
                      <div className="upcoming-game-events-card-body">
                        <h3 className="upcoming-game-events-card-title">
                          {getPrimaryText(event.title, locale)}
                        </h3>
                        <p className="upcoming-game-events-card-when">
                          <span className="upcoming-game-events-card-when-icon" aria-hidden>
                            📅
                          </span>
                          {formatRelativeLabel(event, t)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
