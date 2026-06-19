import { useLocale } from '../i18n/LocaleContext'
import type { SyntaxFold } from '../hooks/useSearchSyntaxCollapse'

interface SearchSyntaxHelpProps {
  fold: SyntaxFold
}

export function SearchSyntaxHelp({ fold }: SearchSyntaxHelpProps) {
  const { t } = useLocale()

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
      id="search-syntax-panel"
      className={panelClass}
      aria-hidden={fold === 'closed'}
    >
      <div className="search-syntax-collapsible-inner">
        <div className="search-syntax-help" aria-label={t('searchSyntaxTitle')}>
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
