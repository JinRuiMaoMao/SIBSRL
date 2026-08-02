import { useCallback, useEffect, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { isRealLayoutMode } from '../utils/appLayoutMode'
import { lockPageScroll } from '../utils/pageScrollLock'

export function RealAlphaOverlay() {
  const { t } = useLocale()
  const [visible, setVisible] = useState(true)

  const dismiss = useCallback(() => {
    setVisible(false)
  }, [])

  useEffect(() => {
    if (!visible) return
    return lockPageScroll()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        dismiss()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismiss, visible])

  if (!isRealLayoutMode() || !visible) return null

  return (
    <div
      className="real-alpha-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="real-alpha-overlay-title"
      aria-describedby="real-alpha-overlay-desc"
      onClick={dismiss}
    >
      <div className="real-alpha-overlay-card">
        <p className="real-alpha-overlay-badge">{t('realAlphaOverlayBadge')}</p>
        <h2 id="real-alpha-overlay-title" className="real-alpha-overlay-title">
          {t('realAlphaOverlayTitle')}
        </h2>
        <p id="real-alpha-overlay-desc" className="real-alpha-overlay-desc">
          {t('realAlphaOverlayDesc')}
        </p>
        <p className="real-alpha-overlay-hint">{t('realAlphaOverlayDismiss')}</p>
      </div>
    </div>
  )
}
