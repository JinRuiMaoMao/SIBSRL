import { useLocale } from '../i18n/LocaleContext'
import { useTheme } from '../theme/ThemeContext'
import type { ThemePreference } from '../theme/types'

export function ThemeToggle({ className = '' }: { className?: string }) {
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
      className={`theme-toggle ${className}`.trim()}
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
          <span aria-hidden>{opt.icon}</span>
        </button>
      ))}
    </div>
  )
}
