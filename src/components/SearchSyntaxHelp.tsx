import { useLocale } from '../i18n/LocaleContext'

interface SearchSyntaxHelpProps {
  open: boolean
}

export function SearchSyntaxHelp({ open }: SearchSyntaxHelpProps) {
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

  return (
        <div
          id="search-syntax-panel"
          className={`search-syntax-collapsible ${open ? 'is-open' : ''}`}
          aria-hidden={!open}
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
