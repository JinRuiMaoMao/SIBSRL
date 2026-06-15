import { useLocale } from '../i18n/LocaleContext'
import { useFavoriteRoutes } from '../contexts/FavoriteRoutesContext'

interface RouteFavoriteButtonProps {
  routeId: string
  className?: string
}

export function RouteFavoriteButton({ routeId, className = '' }: RouteFavoriteButtonProps) {
  const { t } = useLocale()
  const { isFavorite, toggleFavorite } = useFavoriteRoutes()
  const favorited = isFavorite(routeId)

  return (
    <button
      type="button"
      className={`route-favorite-btn ${favorited ? 'is-active' : ''} ${className}`.trim()}
      aria-pressed={favorited}
      aria-label={favorited ? t('favoriteRemove') : t('favoriteAdd')}
      title={favorited ? t('favoriteRemove') : t('favoriteAdd')}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleFavorite(routeId)
      }}
    >
      <span aria-hidden>{favorited ? '★' : '☆'}</span>
    </button>
  )
}
