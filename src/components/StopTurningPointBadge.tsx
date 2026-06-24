import { useLocale } from '../i18n/LocaleContext'

export function StopTurningPointBadge() {
  const { t } = useLocale()
  return (
    <span className="stop-turning-point-badge" title={t('stopTurningPointTitle')}>
      {t('stopTurningPointBadge')}
    </span>
  )
}
