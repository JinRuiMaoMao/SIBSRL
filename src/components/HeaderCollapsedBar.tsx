interface HeaderCollapsedBarProps {
  collapsed: boolean
  title: string
  logoAriaLabel: string
  onLogoClick: () => void
}

export function HeaderCollapsedBar({
  collapsed,
  title,
  logoAriaLabel,
  onLogoClick,
}: HeaderCollapsedBarProps) {
  return (
    <div className="header-collapsed-bar" aria-hidden={!collapsed}>
      <div className="brand brand--collapsed">
        <button
          type="button"
          className="brand-icon-btn"
          onClick={onLogoClick}
          aria-label={logoAriaLabel}
        >
          <span className="brand-icon" aria-hidden>
            🚌
          </span>
        </button>
        <h1 className="header-collapsed-title">{title}</h1>
      </div>
    </div>
  )
}
