import { useMemo } from 'react'
import { routes } from '../data/routes'
import { useLocale } from '../i18n/LocaleContext'
import type { RouteDetailMapStop } from '../utils/routeDetailMapStops'
import { mergeRoutesByBaseNumber } from '../utils/routeMerge'
import { buildRouteHref } from '../utils/routeNavigation'
import { findRoutesPassingStop } from '../utils/routeStopLookup'
import { StopNameDisplay } from './StopNameDisplay'

interface IslandMapStopDetailPopoverProps {
  stop: RouteDetailMapStop
  currentRouteId: string
  onClose: () => void
}

export function IslandMapStopDetailPopover({
  stop,
  currentRouteId,
  onClose,
}: IslandMapStopDetailPopoverProps) {
  const { t } = useLocale()

  const passingRoutes = useMemo(() => {
    const displayRoutes = mergeRoutesByBaseNumber(routes)
    const matched = {
      zh: stop.stop.name.zh,
      en: stop.stop.name.en,
      ...(stop.stop.nameSub ? { nameSub: stop.stop.nameSub } : {}),
      ...(stop.stop.turningPoint ? { turningPoint: stop.stop.turningPoint } : {}),
    }
    return findRoutesPassingStop(matched, displayRoutes).sort((a, b) =>
      a.number.localeCompare(b.number, undefined, { numeric: true }),
    )
  }, [stop.stop])

  return (
    <div className="island-map-stop-popover" role="dialog" aria-label={t('islandMapStopPopoverAria')}>
      <div className="island-map-stop-popover-header">
        <div className="island-map-stop-popover-title">
          <span className="island-map-stop-popover-seq">{stop.seq}</span>
          <StopNameDisplay stop={stop.stop} className="island-map-stop-popover-name" />
        </div>
        <button
          type="button"
          className="island-map-stop-popover-close"
          onClick={onClose}
          aria-label={t('islandMapStopDetailClose')}
        >
          ×
        </button>
      </div>

      <dl className="island-map-stop-popover-meta">
        <div>
          <dt>{t('islandMapStopDetailSeqLabel')}</dt>
          <dd>{t('islandMapStopDetailSeq', { seq: stop.seq })}</dd>
        </div>
        {stop.stop.zone != null ? (
          <div>
            <dt>{t('stopColZone')}</dt>
            <dd>
              <span className="zone-tag">Z{stop.stop.zone}</span>
            </dd>
          </div>
        ) : null}
      </dl>

      <section className="island-map-stop-popover-routes">
        <h3>{t('routesViaStop')}</h3>
        {passingRoutes.length === 0 ? (
          <p className="island-map-stop-popover-empty">{t('islandMapStopDetailNoRoutes')}</p>
        ) : (
          <ul className="island-map-stop-popover-route-list">
            {passingRoutes.map((route) => (
              <li key={route.id}>
                <a
                  className={`island-map-stop-popover-route-link${route.id === currentRouteId ? ' island-map-stop-popover-route-link--current' : ''}`.trim()}
                  href={buildRouteHref(route.id)}
                >
                  <span className="island-map-stop-popover-route-number">{route.number}</span>
                  {route.id === currentRouteId ? (
                    <span className="island-map-stop-popover-route-current">{t('islandMapStopDetailCurrentRoute')}</span>
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
