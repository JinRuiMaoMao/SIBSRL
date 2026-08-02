import { useLocale } from '../i18n/LocaleContext'
import { isRealLayoutMode } from '../utils/appLayoutMode'
import { isSecretPage, isStartPage } from '../utils/appPage'
import { hasSecretAccess } from '../utils/secretAccess'

function SunHintGlyph() {
  return (
    <svg className="logo-secret-floating-hint-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path
        fill="currentColor"
        d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LogoSecretFloatingHint() {
  const { t } = useLocale()

  if (
    isRealLayoutMode() ||
    isStartPage() ||
    isSecretPage() ||
    hasSecretAccess()
  ) {
    return null
  }

  return (
    <div className="logo-secret-floating-hint" role="status" aria-live="polite">
      <SunHintGlyph />
      <span className="logo-secret-floating-hint-text">{t('logoSecretHint')}</span>
    </div>
  )
}
