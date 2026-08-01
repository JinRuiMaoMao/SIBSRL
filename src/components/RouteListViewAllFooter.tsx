import { useLocale } from '../i18n/LocaleContext'

interface RouteListViewAllFooterProps {
  onClick: () => void
}

export function RouteListViewAllFooter({ onClick }: RouteListViewAllFooterProps) {
  const { t } = useLocale()

  return (
    <div className="route-list-view-all-footer">
      <button type="button" className="route-list-view-all-link" onClick={onClick}>
        {t('routeListViewAllPlayable')}
      </button>
    </div>
  )
}
