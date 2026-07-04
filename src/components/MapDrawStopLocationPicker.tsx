import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapCatalogStop } from '../utils/worldMapStopCatalog'

interface MapDrawStopLocationPickerProps {
  locations: readonly WorldMapCatalogStop[]
  selectedCatalogIndex: number | null
  onSelectCatalogIndex: (index: number) => void
}

function formatMapPoint(point: WorldMapPoint): string {
  return `(${point[0].toFixed(3)}, ${point[1].toFixed(3)})`
}

export function MapDrawStopLocationPicker({
  locations,
  selectedCatalogIndex,
  onSelectCatalogIndex,
}: MapDrawStopLocationPickerProps) {
  const { t, locale } = useLocale()

  return (
    <div className="map-draw-stop-location-picker">
      <span className="map-draw-stop-location-picker-title">{t('mapDrawStopLocationTitle')}</span>
      <p className="map-draw-stop-location-hint">{t('mapDrawStopLocationManual')}</p>
      {locations.length > 0 ? (
        <ul className="map-draw-stop-location-list" role="listbox" aria-label={t('mapDrawStopLocationTitle')}>
          {locations.map((entry, index) => {
            const selected = selectedCatalogIndex === index
            return (
              <li key={`${entry.point[0]}|${entry.point[1]}|${index}`} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`map-draw-stop-location-option${selected ? ' map-draw-stop-location-option--active' : ''}`.trim()}
                  onClick={() => onSelectCatalogIndex(index)}
                >
                  <span className="map-draw-stop-location-option-name">
                    {getPrimaryText(entry.name, locale)}
                    <span className="map-draw-stop-location-option-tag">{t('mapDrawStopSuggestCatalog')}</span>
                  </span>
                  <span className="map-draw-stop-location-option-coords">
                    {t('mapDrawStopLocationCoords', { coords: formatMapPoint(entry.point) })}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
