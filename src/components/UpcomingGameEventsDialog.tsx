import { useEffect, useMemo } from 'react'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import {
  getUpcomingGameEventThumbnailUrl,
  listUpcomingGameEvents,
  type UpcomingGameEventView,
} from '../data/upcomingGameEvents'
import { lockPageScroll } from '../utils/pageScrollLock'

interface UpcomingGameEventsDialogProps {
  open: boolean
  onClose: () => void
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

export function UpcomingGameEventsDialog({ open, onClose }: UpcomingGameEventsDialogProps) {
  const { locale, t } = useLocale()
  const events = useMemo(() => (open ? listUpcomingGameEvents() : []), [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

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
        className="upcoming-game-events-panel sibs-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upcoming-game-events-title"
      >
        <span className="sibs-liquid-glass-surface" aria-hidden />
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
                <article className="upcoming-game-events-card">
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
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
