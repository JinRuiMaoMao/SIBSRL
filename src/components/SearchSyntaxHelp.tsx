import { useLocale } from '../i18n/LocaleContext'

export function SearchSyntaxHelp() {
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
    <div className="search-syntax-help" aria-label={t('searchSyntaxTitle')}>
      <p className="search-syntax-title">{t('searchSyntaxTitle')}</p>
      <ul className="search-syntax-list">
        {items.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </div>
  )
}
