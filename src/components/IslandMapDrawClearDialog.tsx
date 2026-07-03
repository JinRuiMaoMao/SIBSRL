import { useEffect, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'

export interface IslandMapDrawClearSelection {
  stops: boolean
  pathNodes: boolean
  path: boolean
}

interface IslandMapDrawClearDialogProps {
  open: boolean
  stopCount: number
  pathNodeCount: number
  hasPath: boolean
  onCancel: () => void
  onConfirm: (selection: IslandMapDrawClearSelection) => void
}

export function IslandMapDrawClearDialog({
  open,
  stopCount,
  pathNodeCount,
  hasPath,
  onCancel,
  onConfirm,
}: IslandMapDrawClearDialogProps) {
  const { t } = useLocale()
  const [clearStops, setClearStops] = useState(false)
  const [clearPathNodes, setClearPathNodes] = useState(false)
  const [clearPath, setClearPath] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setClearStops(stopCount > 0)
    setClearPathNodes(pathNodeCount > 0)
    setClearPath(hasPath)
    setError(null)
  }, [hasPath, open, pathNodeCount, stopCount])

  if (!open) return null

  const handleConfirm = () => {
    if (!clearStops && !clearPathNodes && !clearPath) {
      setError(t('islandMapDrawClearNeedSelection'))
      return
    }
    onConfirm({
      stops: clearStops,
      pathNodes: clearPathNodes,
      path: clearPath,
    })
  }

  const selectAll = () => {
    setClearStops(stopCount > 0)
    setClearPathNodes(pathNodeCount > 0)
    setClearPath(hasPath)
    setError(null)
  }

  return (
    <div className="app-dialog-root island-map-export-dialog-root">
      <button type="button" className="app-dialog-backdrop" aria-hidden onClick={onCancel} />
      <div
        className="app-dialog-panel island-map-export-dialog island-map-draw-clear-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="island-map-draw-clear-title"
      >
        <h2 id="island-map-draw-clear-title" className="island-map-draw-dialog-title">
          {t('islandMapDrawClearDialogTitle')}
        </h2>
        <p className="island-map-draw-dialog-lead">{t('islandMapDrawClearDialogLead')}</p>
        <fieldset className="island-map-draw-export-fieldset">
          <legend>{t('islandMapDrawClearIncludeLegend')}</legend>
          <label className="island-map-draw-export-check">
            <input
              type="checkbox"
              checked={clearStops}
              disabled={stopCount === 0}
              onChange={(event) => setClearStops(event.target.checked)}
            />
            <span>{t('islandMapDrawClearIncludeStops', { count: stopCount })}</span>
          </label>
          <label className="island-map-draw-export-check">
            <input
              type="checkbox"
              checked={clearPathNodes}
              disabled={pathNodeCount === 0}
              onChange={(event) => setClearPathNodes(event.target.checked)}
            />
            <span>{t('islandMapDrawClearIncludePathNodes', { count: pathNodeCount })}</span>
          </label>
          <label className="island-map-draw-export-check">
            <input
              type="checkbox"
              checked={clearPath}
              disabled={!hasPath}
              onChange={(event) => setClearPath(event.target.checked)}
            />
            <span>{t('islandMapDrawClearIncludePath')}</span>
          </label>
        </fieldset>
        {error ? <p className="island-map-draw-export-error">{error}</p> : null}
        <div className="app-dialog-actions">
          <button type="button" className="island-map-btn" onClick={selectAll}>
            {t('islandMapDrawClearSelectAll')}
          </button>
          <button type="button" className="island-map-btn" onClick={onCancel}>
            {t('islandMapDrawExportCancel')}
          </button>
          <button type="button" className="island-map-btn island-map-btn--export" onClick={handleConfirm}>
            {t('islandMapDrawClearConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
