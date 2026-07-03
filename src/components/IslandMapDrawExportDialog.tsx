import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawPathNode, WorldMapDrawStop } from '../types/worldMapDraw'
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
  pathNodes: readonly WorldMapDrawPathNode[]
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
  pathNodes,
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
  const [includePathNodes, setIncludePathNodes] = useState(false)
  const [includePath, setIncludePath] = useState(false)
  const [includeImage, setIncludeImage] = useState(false)
  const [exportBaseName, setExportBaseName] = useState('')
  const [exportRouteId, setExportRouteId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const merged = useMemo(
    () =>
      mergeWorldMapDrawSlices([
        { routeId, directionIndex, points: [...points], stops: [...stops], virtualNodes: [] },
        ...mergeFiles.map((file) => file.slice),
      ]),
    [directionIndex, mergeFiles, points, routeId, stops],
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
        [],
        overlayRouteId,
      ),
    [exportRouteId, filtered.routeId, overlayRouteId, routeId],
  )

  const canIncludePath = filtered.points.length >= 2 || filtered.stops.length >= 2

  useEffect(() => {
    if (!open) return
    const ids = collectWorldMapDrawRouteIds(sourceSlices)
    const preferred = preferredExportRouteId(routeId, ids)
    setExportRouteId(preferred)
    setExportBaseName(preferred || routeId.trim())
    setIncludePath(points.length >= 2)
    setIncludeImage(false)
    setError(null)
  }, [open, points.length, routeId, sourceSlices])

  useEffect(() => {
    if (!open) return
    setIncludeStops(filtered.stops.length > 0)
    setIncludePathNodes(pathNodes.length > 0)
  }, [exportRouteId, filtered.stops.length, open, pathNodes.length])

  if (!open) return null

  const canExportImage = filtered.points.length >= 2 || filtered.stops.length >= 1

  const handleConfirm = () => {
    if (!resolvedRouteId) {
      setError(t('islandMapDrawExportNeedRouteId'))
      return
    }
    if (!includeStops && !includePathNodes && !includePath && !includeImage) {
      setError(t('islandMapDrawExportNeedSelection'))
      return
    }
    if (includeStops && filtered.stops.length === 0) {
      setError(t('islandMapDrawExportNoStops'))
      return
    }
    if (includePathNodes && pathNodes.length === 0) {
      setError(t('islandMapDrawExportNoPathNodes'))
      return
    }
    if (includePath && !canIncludePath) {
      setError(t('islandMapDrawExportNoPath'))
      return
    }
    if (includeImage && !canExportImage) {
      setError(t('islandMapDrawExportNoImage'))
      return
    }
    onConfirm(
      {
        includeStops,
        includePathNodes,
        includePath,
        includeImage,
        exportBaseName: exportBaseName.trim() || resolvedRouteId,
      },
      filtered,
    )
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

        <label className="island-map-export-dialog-route-select">
          <span>{t('islandMapDrawExportFileName')}</span>
          <input
            type="text"
            value={exportBaseName}
            onChange={(event) => setExportBaseName(event.target.value)}
            placeholder={resolvedRouteId || routeId.trim() || 'route'}
          />
        </label>

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
              checked={includePathNodes}
              disabled={pathNodes.length === 0}
              onChange={(event) => setIncludePathNodes(event.target.checked)}
            />
            <span>{t('islandMapDrawExportIncludePathNodes', { count: pathNodes.length })}</span>
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
          <label className="island-map-export-dialog-check">
            <input
              type="checkbox"
              checked={includeImage}
              disabled={!canExportImage}
              onChange={(event) => setIncludeImage(event.target.checked)}
            />
            <span>{t('islandMapDrawExportIncludeImage')}</span>
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

        {error ? <p className="island-map-draw-export-error">{error}</p> : null}
        <div className="app-dialog-actions">
          <button type="button" className="island-map-btn" onClick={onCancel}>
            {t('islandMapDrawExportCancel')}
          </button>
          <button type="button" className="island-map-btn island-map-btn--export" onClick={handleConfirm}>
            {t('islandMapDrawExportConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
