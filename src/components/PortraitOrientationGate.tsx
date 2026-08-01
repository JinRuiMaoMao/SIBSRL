import { usePortraitBlocked } from '../hooks/usePortraitBlocked'
import { useLocale } from '../i18n/LocaleContext'
import { createPortal } from 'react-dom'

export function PortraitOrientationGate() {
  const blocked = usePortraitBlocked()
  const { t } = useLocale()

  if (!blocked) return null

  const node = (
    <div
      className="portrait-orientation-gate portrait-orientation-gate--react"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="portrait-orientation-gate-title"
    >
      <div className="portrait-orientation-gate-card">
        <img
          className="portrait-orientation-gate-logo"
          src="./sibs-logo.png"
          alt=""
          width={56}
          height={56}
          decoding="async"
        />
        <h1 id="portrait-orientation-gate-title">{t('portraitOrientationTitle')}</h1>
        <p>{t('portraitOrientationBody')}</p>
        <div className="portrait-orientation-gate-device" aria-hidden="true">
          <span className="portrait-orientation-gate-phone" />
          <span className="portrait-orientation-gate-arrow">↻</span>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return node
  return createPortal(node, document.body)
}
