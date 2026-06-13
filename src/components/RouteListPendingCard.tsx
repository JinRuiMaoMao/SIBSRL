import { useLocale } from '../i18n/LocaleContext'

interface RouteListPendingCardProps {
  routeId: string
  filteredOut?: boolean
}

export function RouteListPendingCard({ routeId, filteredOut = false }: RouteListPendingCardProps) {
  const { t } = useLocale()

  return (
    <div
      className={`route-card route-card--pending ${filteredOut ? 'route-card--filtered-out' : ''}`.trim()}
      aria-disabled="true"
    >
      <div className="route-card-top">
        <div className="route-card-title">
          <span className="route-number">{routeId}</span>
        </div>
      </div>
      <p className="route-meta">
        {filteredOut ? t('routeListFilteredOut') : t('routeListPending')}
      </p>
    </div>
  )
}
