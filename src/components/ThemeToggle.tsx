import { useLocale } from '../i18n/LocaleContext'
import { useTheme } from '../theme/ThemeContext'
import type { Theme } from '../theme/types'

export function ThemeToggle() {
  const { t } = useLocale()
  const { theme, setTheme } = useTheme()

  const options: { id: Theme; labelKey: 'themeDark' | 'themeLight'; icon: string }[] = [
    { id: 'dark', labelKey: 'themeDark', icon: '🌙' },
    { id: 'light', labelKey: 'themeLight', icon: '☀️' },
  ]

  return (
    <div className="theme-toggle" role="group" aria-label={t('themeLabel')}>
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
