import { useLocale } from '../i18n/LocaleContext'
import { getAlternateLayoutRoutesHref, isRealLayoutMode } from '../utils/appLayoutMode'

interface RouteLayoutToggleButtonProps {
  className?: string
}

export function RouteLayoutToggleButton({ className = '' }: RouteLayoutToggleButtonProps) {
  const { t } = useLocale()
  const realLayout = isRealLayoutMode()
  const alternateLayoutHref = getAlternateLayoutRoutesHref()
  const label = realLayout ? t('routeLookupLayoutGrid') : t('routeLookupLayoutSplit')

  return (
    <a
      className={`route-layout-toggle-btn${realLayout ? ' route-layout-toggle-btn--active' : ''} ${className}`.trim()}
      href={alternateLayoutHref}
      aria-label={t('routeLookupLayoutToggleAria')}
      title={label}
    >
      {label}
    </a>
  )
}
