import { useRef, type RefObject } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { useSearchSyntaxPanelHeight } from '../hooks/useSearchSyntaxPanelHeight'

interface SearchSyntaxHelpProps {
  stickyRef: RefObject<HTMLElement | null>
  visible?: boolean
}

export function SearchSyntaxHelp({ stickyRef, visible = true }: SearchSyntaxHelpProps) {
  const { t } = useLocale()
  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useSearchSyntaxPanelHeight(stickyRef, panelRef, contentRef, visible)

  const items = [
    'searchSyntaxZone',
    'searchSyntaxOperator',
    'searchSyntaxLevel',
    'searchSyntaxType',
    'searchSyntaxExclude',
    'searchSyntaxFromTo',
    'searchSyntaxPattern',
    'searchSyntaxCombine',
  ] as const

  return (
    <div
      ref={panelRef}
      id="search-syntax-panel"
      className="search-syntax-panel"
      aria-hidden={!visible}
    >
      <div className="search-syntax-panel-inner sibs-scrollbar">
        <div ref={contentRef} className="search-syntax-help" aria-label={t('searchSyntaxTitle')}>
          <p className="search-syntax-title">{t('searchSyntaxTitle')}</p>
          <ul className="search-syntax-list">
            {items.map((key) => (
              <li
                key={key}
                className={key === 'searchSyntaxCombine' ? 'search-syntax-list-footnote' : undefined}
              >
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
