import { useLocale } from '../i18n/LocaleContext'
import { buildRouteMapViewerUrl } from '../utils/routeMapImages'

interface RouteMapViewButtonsProps {
  routeId: string
  routeNumber: string
}

export function RouteMapViewButtons({ routeId, routeNumber }: RouteMapViewButtonsProps) {
  const { t } = useLocale()

  return (
    <div className="route-map-view-actions" data-tour="route-detail-map-views">
      <a
        className="route-map-view-btn"
        href={buildRouteMapViewerUrl(routeId, 'path')}
        aria-label={t('routeMapViewAria', { number: routeNumber, label: t('routeMapViewPath') })}
      >
        {t('routeMapViewPath')}
      </a>
    </div>
  )
}
