import { useEffect, useId, useState, type ReactNode } from 'react'
import { useLocale } from '../i18n/LocaleContext'

interface FilterMenuProps {
  active: boolean
  children: ReactNode
}

export function FilterMenu({ active, children }: FilterMenuProps) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="filter-menu">
      <button
        type="button"
        className={`filter-menu-trigger ${active ? 'filter-menu-trigger--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        title={t('filters')}
      >
        <svg className="filter-menu-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            fill="currentColor"
            d="M4 7h16a1 1 0 0 0 0-2H4a1 1 0 0 0 0 2Zm0 6h16a1 1 0 0 0 0-2H4a1 1 0 0 0 0 2Zm0 6h16a1 1 0 0 0 0-2H4a1 1 0 0 0 0 2Z"
          />
        </svg>
        <span className="sr-only">{t('filters')}</span>
      </button>

      {open && (
        <div id={panelId} className="filter-menu-panel" role="dialog" aria-label={t('filters')}>
          <p className="filter-menu-panel-title">{t('filters')}</p>
          {children}
        </div>
      )}
    </div>
  )
}
