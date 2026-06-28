import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawStop, WorldMapVirtualNode } from '../types/worldMapDraw'
import { mergeWorldMapDrawSlices, type WorldMapDrawDraftSlice } from '../utils/worldMapDrawMerge'
import type { WorldMapRouteExportSelection } from '../utils/worldMapRouteExport'
import { resolveWorldMapExportRouteId } from '../utils/worldMapRouteExport'

export interface IslandMapDrawExportMergeFile {
  id: string
  name: string
  slice: WorldMapDrawDraftSlice
}

interface IslandMapDrawExportDialogProps {
  open: boolean
  routeId: string
  directionIndex: number
  stops: readonly WorldMapDrawStop[]
  virtualNodes: readonly WorldMapVirtualNode[]
  points: readonly WorldMapPoint[]
  mergeFiles: readonly IslandMapDrawExportMergeFile[]
  overlayRouteId?: string
  onAddMergeFiles: (files: FileList) => void
  onRemoveMergeFile: (id: string) => void
  onCancel: () => void
  onConfirm: (selection: WorldMapRouteExportSelection, merged: WorldMapDrawDraftSlice) => void
}

export function IslandMapDrawExportDialog({
  open,
  routeId,
  directionIndex,
  stops,
  virtualNodes,
  points,
  mergeFiles,
  overlayRouteId,
  onAddMergeFiles,
  onRemoveMergeFile,
  onCancel,
  onConfirm,
}: IslandMapDrawExportDialogProps) {
  const { t } = useLocale()
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const [includeStops, setIncludeStops] = useState(false)
  const [includeVirtualNodes, setIncludeVirtualNodes] = useState(false)
  const [includePath, setIncludePath] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const merged = useMemo(
    () =>
      mergeWorldMapDrawSlices([
        { routeId, directionIndex, points: [...points], stops: [...stops], virtualNodes: [...virtualNodes] },
        ...mergeFiles.map((file) => file.slice),
      ]),
    [directionIndex, mergeFiles, points, routeId, stops, virtualNodes],
  )

  const resolvedRouteId = useMemo(
    () => resolveWorldMapExportRouteId(routeId || merged.routeId, merged.virtualNodes, overlayRouteId),
    [merged.routeId, merged.virtualNodes, overlayRouteId, routeId],
  )

  const canIncludePath = merged.points.length >= 2 || merged.stops.length >= 2

  useEffect(() => {
    if (!open) return
    setIncludeStops(merged.stops.length > 0)
    setIncludeVirtualNodes(merged.virtualNodes.length > 0)
    setIncludePath(false)
    setError(null)
  }, [merged.stops.length, merged.virtualNodes.length, open])

  if (!open) return null

  const handleConfirm = () => {
    if (!resolvedRouteId) {
      setError(t('islandMapDrawExportNeedRouteId'))
      return
    }
    if (!includeStops && !includeVirtualNodes && !includePath) {
      setError(t('islandMapDrawExportNeedSelection'))
      return
    }
    if (includeStops && merged.stops.length === 0) {
      setError(t('islandMapDrawExportNoStops'))
      return
    }
    if (includeVirtualNodes && merged.virtualNodes.length === 0) {
      setError(t('islandMapDrawExportNoVirtualNodes'))
      return
    }
    if (includePath && !canIncludePath) {
      setError(t('islandMapDrawExportNoPath'))
      return
    }
    onConfirm({ includeStops, includeVirtualNodes, includePath }, merged)
  }

  return (
    <div className="app-dialog-root island-map-export-dialog-root">
      <button type="button" className="app-dialog-backdrop" aria-hidden onClick={onCancel} />
      <div
        className="app-dialog-panel island-map-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="island-map-export-title"
      >
        <h2 id="island-map-export-title" className="app-dialog-title">
          {t('islandMapDrawExportDialogTitle')}
        </h2>
        <p className="app-dialog-message">{t('islandMapDrawExportDialogLead')}</p>

        {resolvedRouteId ? (
          <p className="island-map-export-dialog-route">
            {t('islandMapImportExportRouteLabel', { routeId: resolvedRouteId })}
          </p>
        ) : (
          <p className="island-map-export-dialog-route island-map-export-dialog-route--missing">
            {t('islandMapDrawExportNeedRouteId')}
          </p>
        )}

        <fieldset className="island-map-export-dialog-fieldset">
          <legend>{t('islandMapDrawExportIncludeLegend')}</legend>
          <label className="island-map-export-dialog-check">
            <input
              type="checkbox"
              checked={includeStops}
              disabled={merged.stops.length === 0}
              onChange={(event) => setIncludeStops(event.target.checked)}
            />
            <span>{t('islandMapDrawExportIncludeStops', { count: merged.stops.length })}</span>
          </label>
          <label className="island-map-export-dialog-check">
            <input
              type="checkbox"
              checked={includeVirtualNodes}
              disabled={merged.virtualNodes.length === 0}
              onChange={(event) => setIncludeVirtualNodes(event.target.checked)}
            />
            <span>{t('islandMapDrawExportIncludeVirtualNodes', { count: merged.virtualNodes.length })}</span>
          </label>
          <label className="island-map-export-dialog-check">
            <input
              type="checkbox"
              checked={includePath}
              disabled={!canIncludePath}
              onChange={(event) => setIncludePath(event.target.checked)}
            />
            <span>
              {merged.points.length >= 2
                ? t('islandMapDrawExportIncludePathExisting', { count: merged.points.length })
                : t('islandMapDrawExportIncludePathTrace', { count: merged.stops.length })}
            </span>
          </label>
        </fieldset>

        <div className="island-map-export-dialog-merge">
          <div className="island-map-export-dialog-merge-head">
            <span>{t('islandMapDrawExportMergeTitle')}</span>
            <button
              type="button"
              className="island-map-btn"
              onClick={() => mergeInputRef.current?.click()}
            >
              {t('islandMapDrawExportMergeAdd')}
            </button>
            <input
              ref={mergeInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              className="island-map-draw-import-input"
              onChange={(event) => {
                if (event.target.files?.length) onAddMergeFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </div>
          {mergeFiles.length === 0 ? (
            <p className="island-map-export-dialog-merge-empty">{t('islandMapDrawExportMergeEmpty')}</p>
          ) : (
            <ul className="island-map-export-dialog-merge-list">
              {mergeFiles.map((file) => (
                <li key={file.id}>
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className="island-map-draw-stop-remove"
                    onClick={() => onRemoveMergeFile(file.id)}
                    aria-label={t('islandMapDrawExportMergeRemove')}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? <p className="island-map-export-dialog-error">{error}</p> : null}

        <div className="app-dialog-actions">
          <button type="button" className="app-dialog-btn" onClick={onCancel}>
            {t('islandMapDrawExportCancel')}
          </button>
          <button type="button" className="app-dialog-btn app-dialog-btn--primary" onClick={handleConfirm}>
            {t('islandMapDrawExportConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
