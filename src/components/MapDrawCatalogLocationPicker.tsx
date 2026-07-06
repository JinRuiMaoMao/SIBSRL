import type { WorldMapCatalogStop } from '../utils/worldMapStopCatalog'
import { useLocale } from '../i18n/LocaleContext'

interface MapDrawCatalogLocationPickerProps {
  locations: readonly WorldMapCatalogStop[]
  activeIndex: number | null
  onHoverIndex: (index: number | null) => void
  onPick: (location: WorldMapCatalogStop, index: number) => void
  onManual?: () => void
}

export function MapDrawCatalogLocationPicker({
  locations,
  activeIndex,
  onHoverIndex,
  onPick,
  onManual,
}: MapDrawCatalogLocationPickerProps) {
  const { t } = useLocale()

  return (
    <div className="map-draw-stop-location-picker">
      <p className="map-draw-stop-location-picker-title">{t('mapDrawCatalogLocationPickTitle')}</p>
      <ul className="map-draw-stop-location-list" role="listbox">
        {locations.map((location, index) => {
          const isActive = activeIndex === index
          return (
            <li key={`${location.point[0]}|${location.point[1]}|${index}`} role="option" aria-selected={isActive}>
              <button
                type="button"
                className={`map-draw-stop-location-option${isActive ? ' map-draw-stop-location-option--active' : ''}`.trim()}
                onMouseEnter={() => onHoverIndex(index)}
                onMouseLeave={() => onHoverIndex(null)}
                onFocus={() => onHoverIndex(index)}
                onBlur={() => onHoverIndex(null)}
                onClick={() => onPick(location, index)}
              >
                <span className="map-draw-stop-location-option-name">
                  {t('mapDrawCatalogLocationPreview', { index: index + 1 })}
                  <span className="map-draw-stop-location-option-tag">{location.name.zh || location.name.en}</span>
                </span>
                <span className="map-draw-stop-location-option-coords">
                  {t('mapDrawStopLocationCoords', {
                    coords: `${location.point[0].toFixed(4)}, ${location.point[1].toFixed(4)}`,
                  })}
                </span>
              </button>
            </li>
          )
        })}
        {onManual ? (
          <li role="option">
            <button type="button" className="map-draw-stop-location-option map-draw-stop-location-option--manual" onClick={onManual}>
              {t('mapDrawStopLocationManual')}
            </button>
          </li>
        ) : null}
      </ul>
      <p className="map-draw-stop-location-hint">{t('mapDrawCatalogLocationPickHint')}</p>
    </div>
  )
}
