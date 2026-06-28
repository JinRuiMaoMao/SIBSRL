import { useLocale } from '../i18n/LocaleContext'
import type { IslandMapDrawInteraction } from '../types/worldMapDraw'

interface IslandMapImportExportPanelProps {
  interaction: IslandMapDrawInteraction
  routeId: string
  stopCount: number
  virtualNodeCount: number
  canExport: boolean
  canClear: boolean
  exportHint: string | null
  onImport: () => void
  onExport: () => void
  onClear: () => void
  showMeta?: boolean
  className?: string
}

export function IslandMapImportExportPanel({
  interaction,
  routeId,
  stopCount,
  virtualNodeCount,
  canExport,
  canClear,
  exportHint,
  onImport,
  onExport,
  onClear,
  showMeta = true,
  className = '',
}: IslandMapImportExportPanelProps) {
  const { t } = useLocale()

  const exportTitle =
    interaction === 'catalog'
      ? t('islandMapDrawExportCatalogHint')
      : interaction === 'virtual'
        ? t('islandMapDrawExportVirtualHint')
        : t('islandMapDrawExportRouteHint')

  return (
    <div className={`island-map-draw-panel island-map-import-export-panel ${className}`.trim()}>
      <div className="island-map-draw-panel-row">
        <button
          type="button"
          className="island-map-btn island-map-btn--import"
          onClick={onImport}
          title={t('islandMapDrawImportHint')}
        >
          {t('islandMapDrawImport')}
        </button>
        <button
          type="button"
          className="island-map-btn island-map-btn--export"
          onClick={onExport}
          disabled={!canExport}
          title={exportTitle}
        >
          {t('islandMapDrawExport')}
        </button>
        <button
          type="button"
          className="island-map-btn"
          onClick={onClear}
          disabled={!canClear}
          title={t('islandMapImportExportClearHint')}
        >
          {t('islandMapImportExportClear')}
        </button>
      </div>
      {showMeta ? (
        interaction === 'route' ? (
          <div className="island-map-draw-panel-row island-map-draw-panel-row--meta">
            {routeId ? (
              <span className="island-map-draw-count">
                {t('islandMapImportExportRouteLabel', { routeId })}
              </span>
            ) : null}
            <span className="island-map-draw-count">
              {t('islandMapDrawStopCount', { count: stopCount })}
            </span>
          </div>
        ) : interaction === 'virtual' ? (
          <div className="island-map-draw-panel-row island-map-draw-panel-row--meta">
            <span className="island-map-draw-count">
              {t('islandMapDrawVirtualCount', { count: virtualNodeCount })}
            </span>
          </div>
        ) : (
          <div className="island-map-draw-panel-row island-map-draw-panel-row--meta">
            <span className="island-map-draw-count">
              {t('islandMapDrawStopCount', { count: stopCount })}
            </span>
          </div>
        )
      ) : null}
      <p className="island-map-draw-help">{t('islandMapImportExportHelp')}</p>
      {exportHint ? <p className="island-map-draw-export-hint">{exportHint}</p> : null}
    </div>
  )
}
