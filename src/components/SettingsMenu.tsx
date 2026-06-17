import { useEffect, useId, useRef, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { LOCALE_OPTIONS, type Locale } from '../i18n/types'
import { DisplayPreferencesSection } from './DisplayPreferencesSection'
import { FavoritesBackupSection } from './FavoritesBackupSection'
import { ResetSettingsSection } from './ResetSettingsSection'
import { ThemeToggle } from './ThemeToggle'

export function SettingsMenu() {
  const { locale, setLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

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
        type="button"
        className="settings-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        title={t('settings')}
      >
        <svg
          className="settings-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
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

          <DisplayPreferencesSection />
          <FavoritesBackupSection />
          <ResetSettingsSection />

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
        </div>
      )}
    </div>
  )
}
