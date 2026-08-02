import { useEffect, useMemo } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import { lockPageScroll } from '../utils/pageScrollLock'
import {
  buildPlayableRouteCatalog,
  resolvePlayableRouteCode,
  type PlayableRouteCatalogEntry,
} from '../utils/playableRouteCatalog'

interface RealPlayableRoutesDialogProps {
  open: boolean
  onClose: () => void
  onSelectRoute: (routeId: string, directionIndex: number) => void
}

const SECTION_TITLE_KEYS = {
  anytime: 'realPlayableRoutesAnytime',
  daily: 'realPlayableRoutesDaily',
  seasonal: 'realPlayableRoutesSeasonal',
} as const satisfies Record<'anytime' | 'daily' | 'seasonal', MessageKey>

function RouteCodeList({
  entries,
  onSelect,
}: {
  entries: readonly PlayableRouteCatalogEntry[]
  onSelect: (code: string) => void
}) {
  if (entries.length === 0) return null

  return (
    <p className="real-playable-routes-codes">
      {entries.map((entry, index) => (
        <span key={entry.code}>
          {index > 0 ? ', ' : null}
          <button
            type="button"
            className={`real-playable-routes-code${entry.finished ? ' is-finished' : ''}`}
            onClick={() => onSelect(entry.code)}
          >
            {entry.code}
          </button>
        </span>
      ))}
    </p>
  )
}

export function RealPlayableRoutesDialog({
  open,
  onClose,
  onSelectRoute,
}: RealPlayableRoutesDialogProps) {
  const { t } = useLocale()
  const catalog = useMemo(() => (open ? buildPlayableRouteCatalog() : null), [open])

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

  if (!open || !catalog) return null

  const handleSelect = (code: string) => {
    const selection = resolvePlayableRouteCode(code)
    if (!selection) return
    onSelectRoute(selection.routeId, selection.directionIndex)
    onClose()
  }

  return (
    <div className="real-playable-routes-root">
      <button
        type="button"
        className="real-playable-routes-backdrop"
        aria-label={t('realPlayableRoutesClose')}
        onClick={onClose}
      />
      <div
        className="real-playable-routes-panel sibs-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="real-playable-routes-title"
      >
        <div className="real-playable-routes-header">
          <h2 id="real-playable-routes-title" className="real-playable-routes-title">
            {t('realPlayableRoutesTitle')}
          </h2>
          <button
            type="button"
            className="real-playable-routes-close"
            onClick={onClose}
            aria-label={t('realPlayableRoutesClose')}
          >
            ×
          </button>
        </div>

        <div className="real-playable-routes-body">
          <section className="real-playable-routes-section">
            <h3 className="real-playable-routes-section-title">{t(SECTION_TITLE_KEYS.anytime)}</h3>
            <RouteCodeList entries={catalog.anytime} onSelect={handleSelect} />
          </section>

          <section className="real-playable-routes-section">
            <h3 className="real-playable-routes-section-title">{t(SECTION_TITLE_KEYS.daily)}</h3>
            <RouteCodeList entries={catalog.daily} onSelect={handleSelect} />
          </section>

          <section className="real-playable-routes-section">
            <h3 className="real-playable-routes-section-title">{t(SECTION_TITLE_KEYS.seasonal)}</h3>
            <RouteCodeList entries={catalog.seasonal} onSelect={handleSelect} />
          </section>

          <section className="real-playable-routes-legend" aria-label={t('realPlayableRoutesLegend')}>
            <h3 className="real-playable-routes-section-title">{t('realPlayableRoutesLegend')}</h3>
            <p className="real-playable-routes-legend-row">
              <span className="real-playable-routes-code">{t('realPlayableRoutesUnfinishedSample')}</span>
              <span>{t('realPlayableRoutesUnfinished')}</span>
            </p>
            <p className="real-playable-routes-legend-row">
              <span className="real-playable-routes-code is-finished">
                {t('realPlayableRoutesFinishedSample')}
              </span>
              <span>{t('realPlayableRoutesFinished')}</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
