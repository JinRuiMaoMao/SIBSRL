import { useRef } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { SyntaxFold } from '../hooks/useSearchSyntaxCollapse'
import { useSearchSyntaxPanelHeight } from '../hooks/useSearchSyntaxPanelHeight'

interface SearchSyntaxHelpProps {
  fold: SyntaxFold
}

export function SearchSyntaxHelp({ fold }: SearchSyntaxHelpProps) {
  const { t } = useLocale()
  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useSearchSyntaxPanelHeight(fold, panelRef, contentRef)

  const items = [
    'searchSyntaxZone',
    'searchSyntaxOperator',
    'searchSyntaxLevel',
    'searchSyntaxType',
    'searchSyntaxExclude',
    'searchSyntaxPattern',
    'searchSyntaxCombine',
  ] as const

  const panelClass = [
    'search-syntax-collapsible',
    fold === 'open' ? 'is-open' : '',
    fold === 'half' ? 'is-half' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={panelRef}
      id="search-syntax-panel"
      className={panelClass}
      aria-hidden={fold === 'closed'}
    >
      <div className="search-syntax-collapsible-inner sibs-scrollbar">
        <div ref={contentRef} className="search-syntax-help" aria-label={t('searchSyntaxTitle')}>
          <p className="search-syntax-title">{t('searchSyntaxTitle')}</p>
          <ul className="search-syntax-list">
            {items.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
