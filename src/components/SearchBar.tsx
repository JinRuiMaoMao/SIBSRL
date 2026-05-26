import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  resultCount: number
  totalCount: number
  id?: string
  labelKey?: MessageKey
  placeholderKey?: MessageKey
}

export function SearchBar({
  value,
  onChange,
  resultCount,
  totalCount,
  id = 'route-search',
  labelKey = 'searchLabel',
  placeholderKey = 'searchPlaceholder',
}: SearchBarProps) {
  const { t } = useLocale()

  return (
    <div className="search-bar">
      <label htmlFor={id} className="sr-only">
        {t(labelKey)}
      </label>
      <span className="search-icon" aria-hidden>
        ⌕
      </span>
      <input
        id={id}
        type="search"
        placeholder={t(placeholderKey)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <span className="search-meta" aria-live="polite">
        {t('routeCount', { count: resultCount, total: totalCount })}
      </span>
    </div>
  )
}
