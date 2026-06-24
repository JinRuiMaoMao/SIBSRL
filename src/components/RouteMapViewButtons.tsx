import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import { buildRouteMapViewerUrl, type RouteMapViewKind } from '../utils/routeMapImages'

const VIEW_ORDER: RouteMapViewKind[] = ['path', 'height']

const LABEL_KEYS: Record<RouteMapViewKind, MessageKey> = {
  path: 'routeMapViewPath',
  height: 'routeMapViewHeight',
}

interface RouteMapViewButtonsProps {
  routeId: string
  routeNumber: string
}

export function RouteMapViewButtons({ routeId, routeNumber }: RouteMapViewButtonsProps) {
  const { t } = useLocale()

  return (
    <div className="route-map-view-actions" data-tour="route-detail-map-views">
      {VIEW_ORDER.map((kind) => {
        const label = t(LABEL_KEYS[kind])
        return (
          <a
            key={kind}
            className="route-map-view-btn"
            href={buildRouteMapViewerUrl(routeId, kind)}
            target="_blank"
            rel="noreferrer"
            aria-label={t('routeMapViewAria', { number: routeNumber, label })}
          >
            {label}
          </a>
        )
      })}
    </div>
  )
}
