import { useLocale } from '../i18n/LocaleContext'
import { useTheme } from '../theme/ThemeContext'
import type { ThemePreference } from '../theme/types'

export function ThemeToggle({
  className = '',
  showLabels = false,
}: {
  className?: string
  showLabels?: boolean
}) {
  const { t } = useLocale()
  const { theme, setTheme } = useTheme()

  const options: {
    id: ThemePreference
    labelKey: 'themeSystem' | 'themeDark' | 'themeLight'
    icon: string
  }[] = [
    { id: 'system', labelKey: 'themeSystem', icon: '🌓' },
    { id: 'dark', labelKey: 'themeDark', icon: '🌙' },
    { id: 'light', labelKey: 'themeLight', icon: '☀️' },
  ]

  return (
    <div
      className={`theme-toggle ${showLabels ? 'theme-toggle--labeled' : ''} ${className}`.trim()}
      role="group"
      aria-label={t('themeLabel')}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className="theme-toggle-btn"
          aria-pressed={theme === opt.id}
          aria-label={t(opt.labelKey)}
          title={t(opt.labelKey)}
          onClick={() => setTheme(opt.id)}
        >
          <span className="theme-toggle-icon" aria-hidden>
            {opt.icon}
          </span>
          {showLabels ? <span className="theme-toggle-label">{t(opt.labelKey)}</span> : null}
        </button>
      ))}
    </div>
  )
}
