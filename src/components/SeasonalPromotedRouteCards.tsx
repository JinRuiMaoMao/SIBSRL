import type { SeasonalPromotionEntry } from '../utils/seasonalRoutePromotions'
import { SeasonalPromotedRouteCard } from './SeasonalPromotedRouteCard'

interface SeasonalPromotedRouteCardsProps {
  promotions: readonly SeasonalPromotionEntry[]
  selectedRouteId: string | null
  onNavigate: (routeId: string) => void
  layout?: 'grid' | 'split'
}

export function SeasonalPromotedRouteCards({
  promotions,
  selectedRouteId,
  onNavigate,
  layout = 'grid',
}: SeasonalPromotedRouteCardsProps) {
  if (promotions.length === 0) return null

  return (
    <>
      {promotions.map((promotion) => {
        const card = (
          <SeasonalPromotedRouteCard
            route={promotion.route}
            displayNumber={
              promotion.listedId !== promotion.route.number ? promotion.listedId : undefined
            }
            directionIndex={promotion.directionIndex}
            window={promotion.window}
            selected={selectedRouteId === promotion.route.id}
            onNavigate={onNavigate}
          />
        )

        if (layout === 'split') {
          return (
            <div
              key={`seasonal-promoted-${promotion.route.id}`}
              className="route-split-list-item route-split-list-item--seasonal-promoted"
              role="listitem"
            >
              {card}
            </div>
          )
        }

        return <div key={`seasonal-promoted-${promotion.route.id}`}>{card}</div>
      })}
    </>
  )
}
