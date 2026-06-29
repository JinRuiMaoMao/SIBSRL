import { useLocale } from '../i18n/LocaleContext'
import type { IslandMapDrawInteraction } from '../types/worldMapDraw'

interface IslandMapDrawInteractionTabsProps {
  interaction: IslandMapDrawInteraction
  onInteractionChange: (interaction: IslandMapDrawInteraction) => void
  hideVirtualTab?: boolean
}

export function IslandMapDrawInteractionTabs({
  interaction,
  onInteractionChange,
  hideVirtualTab = false,
}: IslandMapDrawInteractionTabsProps) {
  const { t } = useLocale()

  return (
    <div className="island-map-draw-panel-row">
      <button
        type="button"
        className={`island-map-btn${interaction === 'route' ? ' island-map-btn--active' : ''}`.trim()}
        onClick={() => onInteractionChange('route')}
        aria-pressed={interaction === 'route'}
      >
        {t('islandMapDrawRouteMode')}
      </button>
      <button
        type="button"
        className={`island-map-btn${interaction === 'path-node' ? ' island-map-btn--active' : ''}`.trim()}
        onClick={() => onInteractionChange('path-node')}
        aria-pressed={interaction === 'path-node'}
      >
        {t('islandMapDrawPathNodeMode')}
      </button>
      {hideVirtualTab ? null : (
        <button
          type="button"
          className={`island-map-btn${interaction === 'virtual' ? ' island-map-btn--active' : ''}`.trim()}
          onClick={() => onInteractionChange('virtual')}
          aria-pressed={interaction === 'virtual'}
        >
          {t('islandMapDrawVirtualMode')}
        </button>
      )}
      <button
        type="button"
        className={`island-map-btn${interaction === 'catalog' ? ' island-map-btn--active' : ''}`.trim()}
        onClick={() => onInteractionChange('catalog')}
        aria-pressed={interaction === 'catalog'}
      >
        {t('islandMapDrawCatalogMode')}
      </button>
    </div>
  )
}
