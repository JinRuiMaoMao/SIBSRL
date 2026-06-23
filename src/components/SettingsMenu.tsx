import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { DisplayPreferencesSection } from './DisplayPreferencesSection'
import { ResetSettingsSection } from './ResetSettingsSection'
import { RouteDataFeedbackDialog } from './RouteDataFeedbackDialog'
import { ThemeToggle } from './ThemeToggle'
import { resolveReplayGuidedTourContext } from '../data/guidedTourSteps'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import { useGuidedTourControl } from '../contexts/GuidedTourContext'
import { useLocale } from '../i18n/LocaleContext'
import { LOCALE_OPTIONS, type Locale } from '../i18n/types'

export function SettingsMenu() {
  const { locale, setLocale, t } = useLocale()
  const { guidedTourAutoStart, setGuidedTourAutoStart } = useAppPreferences()
  const { openTour, cancelAutoStartTimer, closeTour } = useGuidedTourControl()
  const [open, setOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useLayoutEffect(() => {
    if (!open) {
      document.documentElement.style.removeProperty('--settings-panel-top')
      document.documentElement.style.removeProperty('--settings-panel-right')
      return
    }

    const syncPanelAnchor = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      document.documentElement.style.setProperty('--settings-panel-top', `${rect.bottom}px`)
      document.documentElement.style.setProperty(
        '--settings-panel-right',
        `${Math.max(0, window.innerWidth - rect.right)}px`,
      )
    }

    syncPanelAnchor()
    window.addEventListener('resize', syncPanelAnchor)
    window.addEventListener('scroll', syncPanelAnchor, { passive: true, capture: true })
    return () => {
      window.removeEventListener('resize', syncPanelAnchor)
      window.removeEventListener('scroll', syncPanelAnchor, true)
      document.documentElement.style.removeProperty('--settings-panel-top')
      document.documentElement.style.removeProperty('--settings-panel-right')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const selectLocale = (value: Locale) => {
    setLocale(value)
    setOpen(false)
  }

  return (
    <div className="settings-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="settings-trigger"
        data-tour="settings"
        onClick={() => {
          setOpen((value) => !value)
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        title={t('settings')}
      >
        <svg
          className="settings-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l-.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"
          />
        </svg>
        <span className="sr-only">{t('settings')}</span>
      </button>

      {open && (
        <div
          id={panelId}
          className="settings-panel sibs-scrollbar"
          role="dialog"
          aria-label={t('settings')}
        >
          <section className="settings-section">
            <p className="settings-panel-title">{t('themeLabel')}</p>
            <ThemeToggle className="settings-theme-toggle" />
          </section>

          <section className="settings-section">
            <p className="settings-panel-title">{t('language')}</p>
            <div className="settings-locale-grid">
              {LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`settings-locale-option ${locale === opt.value ? 'active' : ''}`}
                  onClick={() => selectLocale(opt.value)}
                  aria-pressed={locale === opt.value}
                >
                  {opt.nativeLabel}
                </button>
              ))}
            </div>
          </section>

          <DisplayPreferencesSection />
          <section className="settings-section">
            <p className="settings-panel-title">{t('guidedTourSettingsTitle')}</p>
            <div className="settings-field">
              <p className="settings-field-label">{t('guidedTourAutoStart')}</p>
              <div className="settings-toggle-group" role="group" aria-label={t('guidedTourAutoStart')}>
                <button
                  type="button"
                  className="settings-toggle-btn"
                  aria-pressed={!guidedTourAutoStart}
                  onClick={() => {
                    setGuidedTourAutoStart(false)
                    cancelAutoStartTimer()
                    closeTour()
                  }}
                >
                  {t('settingOff')}
                </button>
                <button
                  type="button"
                  className="settings-toggle-btn"
                  aria-pressed={guidedTourAutoStart}
                  onClick={() => setGuidedTourAutoStart(true)}
                >
                  {t('settingOn')}
                </button>
              </div>
              <p className="settings-hint">{t('guidedTourAutoStartHint')}</p>
            </div>
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => {
                setOpen(false)
                openTour({ manual: true, mode: resolveReplayGuidedTourContext() })
              }}
            >
              {t('guidedTourReplay')}
            </button>
          </section>
          <section className="settings-section">
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => {
                setFeedbackOpen(true)
                setOpen(false)
              }}
            >
              {t('feedbackOpen')}
            </button>
          </section>
          <ResetSettingsSection />
        </div>
      )}

      <RouteDataFeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
