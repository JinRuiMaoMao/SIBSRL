import { useLocale } from '../i18n/LocaleContext'
import { getStartPageHref } from '../utils/appPage'
import { navigateRealShellStart } from '../utils/realShellNavigation'

export function RealRouteSplitHeader() {
  const { t } = useLocale()

  return (
    <div className="route-split-header">
      <a
        className="route-split-back"
        href={getStartPageHref()}
        onClick={(event) => {
          event.preventDefault()
          navigateRealShellStart()
        }}
        aria-label={t('realRouteBackHome')}
      >
        <span className="route-split-back-icon" aria-hidden="true">
          ‹
        </span>
      </a>
      <h1 className="route-split-title">{t('realRouteSelectTitle')}</h1>
    </div>
  )
}
