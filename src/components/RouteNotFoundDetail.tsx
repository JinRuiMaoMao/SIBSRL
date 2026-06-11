import { useLocale } from '../i18n/LocaleContext'

interface RouteNotFoundDetailProps {
  routeId: string
  onClose: () => void
  className?: string
}

export function RouteNotFoundDetail({
  routeId,
  onClose,
  className = '',
}: RouteNotFoundDetailProps) {
  const { t } = useLocale()

  return (
    <aside
      className={`route-detail route-not-found ${className}`.trim()}
      aria-label={t('routeNotFoundAria', { routeId })}
    >
      <div className="detail-header">
        <div className="detail-header-title">
          <span className="route-not-found-code">404</span>
        </div>
        <button type="button" className="close-btn" onClick={onClose} aria-label={t('closeDetail')}>
          ×
        </button>
      </div>

      <section className="detail-section route-not-found-body">
        <h3 className="route-not-found-title">{t('routeNotFoundTitle')}</h3>
        <p className="route-not-found-message">{t('routeNotFoundMessage', { routeId })}</p>
        <p className="route-not-found-hint">{t('routeNotFoundHint')}</p>
      </section>
    </aside>
  )
}
