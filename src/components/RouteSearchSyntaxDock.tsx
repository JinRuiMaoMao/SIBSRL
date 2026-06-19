import { useRef, useState, type RefObject } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { useSearchSyntaxScrollHide } from '../hooks/useSearchSyntaxScrollHide'
import { SearchSyntaxHelp } from './SearchSyntaxHelp'

interface RouteSearchSyntaxDockProps {
  stickyRef: RefObject<HTMLElement | null>
}

export function RouteSearchSyntaxDock({ stickyRef }: RouteSearchSyntaxDockProps) {
  const { t } = useLocale()
  const dockRef = useRef<HTMLDivElement>(null)
  const [manualHidden, setManualHidden] = useState(false)
  const { scrollHidden, clearScrollHidden } = useSearchSyntaxScrollHide(stickyRef, dockRef)
  const syntaxVisible = !scrollHidden && !manualHidden

  const handleToggle = () => {
    if (scrollHidden) {
      clearScrollHidden()
      setManualHidden(false)
      return
    }
    setManualHidden((value) => !value)
  }

  return (
    <div
      ref={dockRef}
      className={`route-syntax-dock${scrollHidden ? ' is-scroll-hidden' : ''}${manualHidden ? ' is-manual-collapsed' : ''}`}
    >
      <div className="route-syntax-shell">
        <div className="search-help-bar">
          <p className="search-shortcut-hint">
            <span>{t('searchShortcutHint')}</span>
            <span className="search-shortcut-sep" aria-hidden>
              {' · '}
            </span>
            <span className="search-shortcut-close">
              Esc {t('closeDetail')}
            </span>
          </p>
          <button
            type="button"
            className="search-syntax-toggle"
            aria-expanded={syntaxVisible}
            aria-controls="search-syntax-panel"
            onClick={handleToggle}
          >
            {syntaxVisible ? t('searchSyntaxCollapse') : t('searchSyntaxExpand')}
          </button>
        </div>
        <SearchSyntaxHelp stickyRef={stickyRef} visible={syntaxVisible} />
      </div>
    </div>
  )
}
