import { useLocale } from '../i18n/LocaleContext'
import type { IslandMapDrawInteraction } from '../types/worldMapDraw'

interface IslandMapImportExportPanelProps {
  interaction: IslandMapDrawInteraction
  routeId: string
  stopCount: number
  pathNodeCount: number
  canExport: boolean
  canClear: boolean
  exportHint: string | null
  onImport: () => void
  onExport: () => void
  onClear: () => void
  onDrawRequest?: () => void
  showMeta?: boolean
  className?: string
}

export function IslandMapImportExportPanel({
  routeId,
  stopCount,
  pathNodeCount,
  canExport,
  canClear,
  exportHint,
  onImport,
  onExport,
  onClear,
  onDrawRequest,
  showMeta = true,
  className = '',
}: IslandMapImportExportPanelProps) {
  const { t } = useLocale()

  const exportTitle = t('islandMapDrawExportRouteHint')

  return (
    <div className={`island-map-draw-panel island-map-import-export-panel ${className}`.trim()}>
      <div className="island-map-draw-panel-row">
        {onDrawRequest ? (
          <button
            type="button"
            className="island-map-btn island-map-btn--draw"
            onClick={onDrawRequest}
            title={t('islandMapDrawPermissionButtonHint')}
          >
            {t('islandMapDraw')}
          </button>
        ) : null}
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
        <div className="island-map-draw-panel-row island-map-draw-panel-row--meta">
          {routeId ? (
            <span className="island-map-draw-count">
              {t('islandMapImportExportRouteLabel', { routeId })}
            </span>
          ) : null}
          <span className="island-map-draw-count">
            {t('islandMapDrawStopCount', { count: stopCount })}
          </span>
          <span className="island-map-draw-count">
            {t('islandMapDrawPathNodeCount', { count: pathNodeCount })}
          </span>
        </div>
      ) : null}
      <p className="island-map-draw-help">{t('islandMapImportExportHelp')}</p>
      {exportHint ? <p className="island-map-draw-export-hint">{exportHint}</p> : null}
    </div>
  )
}
