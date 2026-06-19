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
  const scrollHidden = useSearchSyntaxScrollHide(stickyRef, dockRef)
  const hidden = scrollHidden || manualHidden
  const syntaxOpen = !hidden

  return (
    <div
      ref={dockRef}
      className={`route-syntax-dock${hidden ? ' is-hidden' : ''}`}
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
            aria-expanded={syntaxOpen}
            aria-controls="search-syntax-panel"
            onClick={() => setManualHidden((value) => !value)}
          >
            {syntaxOpen ? t('searchSyntaxCollapse') : t('searchSyntaxExpand')}
          </button>
        </div>
        <SearchSyntaxHelp stickyRef={stickyRef} visible={!hidden} />
      </div>
    </div>
  )
}
