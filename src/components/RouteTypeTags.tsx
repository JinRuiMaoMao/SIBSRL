import { TYPE_FILTER_KEYS } from '../i18n/routeTypes'
import { useLocale } from '../i18n/LocaleContext'
import type { RouteTypeFilter } from '../types/route'

interface RouteTypeTagsProps {
  types: RouteTypeFilter[]
  compact?: boolean
  alignEnd?: boolean
}

export function RouteTypeTags({ types, compact, alignEnd }: RouteTypeTagsProps) {
  const { t } = useLocale()
  if (!types.length) return null

  return (
    <div
      className={`route-type-tags ${compact ? 'compact' : ''} ${alignEnd ? 'align-end' : ''}`}
    >
      {types.map((type) => (
        <span
          key={type}
          className={`route-type-tag tag-${type === 'centralAxis' ? 'central-axis' : type}`}
        >
          {t(TYPE_FILTER_KEYS[type])}
        </span>
      ))}
    </div>
  )
}
