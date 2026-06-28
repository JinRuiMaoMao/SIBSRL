import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawStop, WorldMapVirtualNode } from '../types/worldMapDraw'
import {
  collectWorldMapDrawRouteIds,
  filterWorldMapDrawSliceForRoute,
  mergeWorldMapDrawSlices,
  type WorldMapDrawDraftSlice,
} from '../utils/worldMapDrawMerge'
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
  sourceSlices: readonly WorldMapDrawDraftSlice[]
  overlayRouteId?: string
  onAddMergeFiles: (files: FileList) => void
  onRemoveMergeFile: (id: string) => void
  onCancel: () => void
  onConfirm: (selection: WorldMapRouteExportSelection, merged: WorldMapDrawDraftSlice) => void
}

function preferredExportRouteId(routeId: string, ids: readonly string[]): string {
  const trimmed = routeId.trim()
  const canonical = trimmed ? (resolveWorldMapRouteId(trimmed) ?? trimmed) : ''
  if (canonical && ids.includes(canonical)) return canonical
  return ids[0] ?? canonical
}

export function IslandMapDrawExportDialog({
  open,
  routeId,
  directionIndex,
  stops,
  virtualNodes,
  points,
  mergeFiles,
  sourceSlices,
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
  const [exportRouteId, setExportRouteId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const merged = useMemo(
    () =>
      mergeWorldMapDrawSlices([
        { routeId, directionIndex, points: [...points], stops: [...stops], virtualNodes: [...virtualNodes] },
        ...mergeFiles.map((file) => file.slice),
      ]),
    [directionIndex, mergeFiles, points, routeId, stops, virtualNodes],
  )

  const routeIds = useMemo(() => collectWorldMapDrawRouteIds(sourceSlices), [sourceSlices])

  const filtered = useMemo(
    () =>
      exportRouteId
        ? filterWorldMapDrawSliceForRoute(merged, exportRouteId, sourceSlices)
        : merged,
    [exportRouteId, merged, sourceSlices],
  )

  const resolvedRouteId = useMemo(
    () =>
      resolveWorldMapExportRouteId(
        exportRouteId || routeId || filtered.routeId,
        filtered.virtualNodes,
        overlayRouteId,
      ),
    [exportRouteId, filtered.routeId, filtered.virtualNodes, overlayRouteId, routeId],
  )

  const canIncludePath = filtered.points.length >= 2 || filtered.stops.length >= 2

  useEffect(() => {
    if (!open) return
    const ids = collectWorldMapDrawRouteIds(sourceSlices)
    setExportRouteId(preferredExportRouteId(routeId, ids))
    setIncludePath(false)
    setError(null)
  }, [open, routeId, sourceSlices])

  useEffect(() => {
    if (!open) return
    setIncludeStops(filtered.stops.length > 0)
    setIncludeVirtualNodes(filtered.virtualNodes.length > 0)
  }, [exportRouteId, filtered.stops.length, filtered.virtualNodes.length, open])

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
    if (includeStops && filtered.stops.length === 0) {
      setError(t('islandMapDrawExportNoStops'))
      return
    }
    if (includeVirtualNodes && filtered.virtualNodes.length === 0) {
      setError(t('islandMapDrawExportNoVirtualNodes'))
      return
    }
    if (includePath && !canIncludePath) {
      setError(t('islandMapDrawExportNoPath'))
      return
    }
    onConfirm({ includeStops, includeVirtualNodes, includePath }, filtered)
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

        {routeIds.length > 1 ? (
          <label className="island-map-export-dialog-route-select">
            <span>{t('islandMapDrawExportRouteSelect')}</span>
            <select value={exportRouteId} onChange={(event) => setExportRouteId(event.target.value)}>
              {routeIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        ) : null}

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
              disabled={filtered.stops.length === 0}
              onChange={(event) => setIncludeStops(event.target.checked)}
            />
            <span>{t('islandMapDrawExportIncludeStops', { count: filtered.stops.length })}</span>
          </label>
          <label className="island-map-export-dialog-check">
            <input
              type="checkbox"
              checked={includeVirtualNodes}
              disabled={filtered.virtualNodes.length === 0}
              onChange={(event) => setIncludeVirtualNodes(event.target.checked)}
            />
            <span>
              {t('islandMapDrawExportIncludeVirtualNodes', { count: filtered.virtualNodes.length })}
            </span>
          </label>
          <label className="island-map-export-dialog-check">
            <input
              type="checkbox"
              checked={includePath}
              disabled={!canIncludePath}
              onChange={(event) => setIncludePath(event.target.checked)}
            />
            <span>
              {filtered.points.length >= 2
                ? t('islandMapDrawExportIncludePathExisting', { count: filtered.points.length })
                : t('islandMapDrawExportIncludePathTrace', { count: filtered.stops.length })}
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
