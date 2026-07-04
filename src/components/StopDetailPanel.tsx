import { useMemo } from 'react'
import { routes } from '../data/routes'
import { useLocale } from '../i18n/LocaleContext'
import type { RouteStop } from '../types/route'
import { mergeRoutesByBaseNumber } from '../utils/routeMerge'
import { buildRouteHref } from '../utils/routeNavigation'
import { findRoutesPassingStop } from '../utils/routeStopLookup'
import { resolveStopDisplay } from '../utils/stopTurningPoint'
import { StopNameDisplay } from './StopNameDisplay'
import { StopTurningPointBadge } from './StopTurningPointBadge'

interface StopDetailPanelProps {
  stop: RouteStop
  seq: number
  currentRouteId: string
  className?: string
  onClose?: () => void
}

export function StopDetailPanel({
  stop,
  seq,
  currentRouteId,
  className = '',
  onClose,
}: StopDetailPanelProps) {
  const { t } = useLocale()
  const display = resolveStopDisplay(stop)

  const passingRoutes = useMemo(() => {
    const displayRoutes = mergeRoutesByBaseNumber(routes)
    const matched = {
      zh: stop.name.zh,
      en: stop.name.en,
      ...(stop.nameSub ? { nameSub: stop.nameSub } : {}),
      ...(stop.turningPoint ? { turningPoint: stop.turningPoint } : {}),
    }
    return findRoutesPassingStop(matched, displayRoutes).sort((a, b) =>
      a.number.localeCompare(b.number, undefined, { numeric: true }),
    )
  }, [stop])

  return (
    <div className={`stop-detail-panel ${className}`.trim()} role="region" aria-label={t('stopDetailPanelAria')}>
      <div className="stop-detail-panel-header">
        <div className="stop-detail-panel-title">
          <span className="stop-detail-panel-seq">{seq}</span>
          <div className="stop-detail-panel-names">
            <StopNameDisplay stop={display} className="stop-detail-panel-name-zh" />
            <p className="stop-detail-panel-name-en detail-en">{display.name.en}</p>
            {display.nameSub ? (
              <p className="stop-detail-panel-name-sub detail-en">{display.nameSub.en}</p>
            ) : null}
            {display.turningPoint ? <StopTurningPointBadge /> : null}
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            className="stop-detail-panel-close"
            onClick={onClose}
            aria-label={t('stopDetailPanelClose')}
          >
            ×
          </button>
        ) : null}
      </div>

      {stop.zone != null ? (
        <p className="stop-detail-panel-zone">
          <span className="zone-tag zone-tag--table">Z{stop.zone}</span>
        </p>
      ) : null}

      <section className="stop-detail-panel-routes">
        <h3>{t('routesViaStop')}</h3>
        {passingRoutes.length === 0 ? (
          <p className="stop-detail-panel-empty">{t('islandMapStopDetailNoRoutes')}</p>
        ) : (
          <ul className="stop-detail-panel-route-list">
            {passingRoutes.map((route) => (
              <li key={route.id}>
                <a
                  className={`stop-detail-panel-route-link${route.id === currentRouteId ? ' stop-detail-panel-route-link--current' : ''}`.trim()}
                  href={buildRouteHref(route.id)}
                >
                  <span className="stop-detail-panel-route-number">{route.number}</span>
                  {route.id === currentRouteId ? (
                    <span className="stop-detail-panel-route-current">{t('islandMapStopDetailCurrentRoute')}</span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
