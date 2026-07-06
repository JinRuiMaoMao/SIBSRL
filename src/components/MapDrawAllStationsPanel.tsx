import { useMemo } from 'react'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { RouteEditorNode } from '../routeEditor/types'
import { catalogStopListKey, isMapDrawCatalogStopPlaced } from '../utils/mapDrawCatalogPlaced'
import type { WorldMapCatalogStop } from '../utils/worldMapStopCatalog'

export type MapDrawAllStationsFilter = 'all' | 'added' | 'not-added'

interface MapDrawAllStationsPanelProps {
  catalog: readonly WorldMapCatalogStop[] | null
  nodes: readonly RouteEditorNode[]
  imageWidth: number
  imageHeight: number
  showAll: boolean
  filter: MapDrawAllStationsFilter
  onShowAllChange: (value: boolean) => void
  onFilterChange: (filter: MapDrawAllStationsFilter) => void
  onSelectStation?: (stop: WorldMapCatalogStop) => void
}

export function MapDrawAllStationsPanel({
  catalog,
  nodes,
  imageWidth,
  imageHeight,
  showAll,
  filter,
  onShowAllChange,
  onFilterChange,
  onSelectStation,
}: MapDrawAllStationsPanelProps) {
  const { locale, t } = useLocale()

  const rows = useMemo(() => {
    if (!catalog?.length) return []
    return catalog.map((stop, index) => ({
      stop,
      index,
      key: catalogStopListKey(stop, index),
      placed: isMapDrawCatalogStopPlaced(stop, nodes, imageWidth, imageHeight),
    }))
  }, [catalog, imageWidth, imageHeight, nodes])

  const filteredRows = useMemo(() => {
    if (filter === 'added') return rows.filter((row) => row.placed)
    if (filter === 'not-added') return rows.filter((row) => !row.placed)
    return rows
  }, [filter, rows])

  const addedCount = rows.filter((row) => row.placed).length

  return (
    <section className="route-editor-panel map-draw-all-stations-panel">
      <label className="island-map-draw-stop-label-check map-draw-all-stations-toggle">
        <input type="checkbox" checked={showAll} onChange={(event) => onShowAllChange(event.target.checked)} />
        <span>{t('mapDrawAllStationsShow')}</span>
      </label>

      {showAll ? (
        <>
          <div className="map-draw-all-stations-filters" role="tablist" aria-label={t('mapDrawAllStationsFilterLabel')}>
            {(
              [
                ['all', t('mapDrawAllStationsFilterAll')],
                ['added', t('mapDrawAllStationsFilterAdded', { count: addedCount })],
                ['not-added', t('mapDrawAllStationsFilterNotAdded', { count: rows.length - addedCount })],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={`route-editor-btn map-draw-all-stations-filter${filter === value ? ' route-editor-btn--active' : ''}`.trim()}
                onClick={() => onFilterChange(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {!catalog?.length ? (
            <p className="island-map-draw-help">{t('mapDrawAllStationsEmpty')}</p>
          ) : filteredRows.length === 0 ? (
            <p className="island-map-draw-help">{t('mapDrawAllStationsFilterEmpty')}</p>
          ) : (
            <ul className="map-draw-all-stations-list" role="listbox">
              {filteredRows.map((row) => {
                const label = getPrimaryText(row.stop.name, locale)
                return (
                  <li key={row.key} role="option">
                    <button
                      type="button"
                      className={`map-draw-all-stations-item${row.placed ? ' map-draw-all-stations-item--placed' : ''}`.trim()}
                      onClick={() => onSelectStation?.(row.stop)}
                    >
                      <span className="map-draw-all-stations-item-label">
                        {row.placed ? (
                          <span className="map-draw-all-stations-check" aria-hidden>
                            ✓
                          </span>
                        ) : null}
                        <span>{label}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}
