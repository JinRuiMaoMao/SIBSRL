import { useLocale } from '../i18n/LocaleContext'
import { navigateRealShellStart } from '../utils/realShellNavigation'
import { REAL_ROUTE_SELECTION_LAYOUT } from '../data/realRouteSelectionLayout'

function RouteSelectionExitIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        fill="currentColor"
        d="M14.5 5 9 12l5.5 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function RealRouteSelectionTop() {
  const { t } = useLocale()
  const { topTitleSizePx } = REAL_ROUTE_SELECTION_LAYOUT

  return (
    <header className="route-selection-top">
      <button
        type="button"
        className="route-selection-exit-btn"
        onClick={() => navigateRealShellStart()}
        aria-label={t('realRouteBackHome')}
      >
        <RouteSelectionExitIcon />
      </button>
      <h1
        className="route-selection-top-title"
        style={{ fontSize: `${topTitleSizePx}px` }}
      >
        {t('realRouteSelectTitle')}
      </h1>
    </header>
  )
}

/** @deprecated Prefer RealRouteSelectionTop */
export const RealRouteSplitHeader = RealRouteSelectionTop
