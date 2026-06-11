import { useLocale } from '../i18n/LocaleContext'

interface HeaderCollapseToggleProps {
  collapsed: boolean
  onToggle: () => void
}

export function HeaderCollapseToggle({ collapsed, onToggle }: HeaderCollapseToggleProps) {
  const { t } = useLocale()

  return (
    <button
      type="button"
      className="header-collapse-toggle"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? t('headerExpand') : t('headerCollapse')}
      title={collapsed ? t('headerExpand') : t('headerCollapse')}
    >
      <svg className="header-collapse-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill="currentColor"
          d="M12 7.5 18 13.5l-1.4 1.4L12 10.3 7.4 14.9 6 13.5z"
        />
      </svg>
    </button>
  )
}
