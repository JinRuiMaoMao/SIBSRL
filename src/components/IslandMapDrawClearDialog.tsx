import { useEffect, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'

export interface IslandMapDrawClearSelection {
  stops: boolean
  virtualNodes: boolean
  path: boolean
}

interface IslandMapDrawClearDialogProps {
  open: boolean
  stopCount: number
  virtualNodeCount: number
  hasPath: boolean
  onCancel: () => void
  onConfirm: (selection: IslandMapDrawClearSelection) => void
}

export function IslandMapDrawClearDialog({
  open,
  stopCount,
  virtualNodeCount,
  hasPath,
  onCancel,
  onConfirm,
}: IslandMapDrawClearDialogProps) {
  const { t } = useLocale()
  const [clearStops, setClearStops] = useState(false)
  const [clearVirtualNodes, setClearVirtualNodes] = useState(false)
  const [clearPath, setClearPath] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setClearStops(stopCount > 0)
    setClearVirtualNodes(virtualNodeCount > 0)
    setClearPath(hasPath)
    setError(null)
  }, [hasPath, open, stopCount, virtualNodeCount])

  if (!open) return null

  const handleConfirm = () => {
    if (!clearStops && !clearVirtualNodes && !clearPath) {
      setError(t('islandMapDrawClearNeedSelection'))
      return
    }
    onConfirm({
      stops: clearStops,
      virtualNodes: clearVirtualNodes,
      path: clearPath,
    })
  }

  const selectAll = () => {
    setClearStops(stopCount > 0)
    setClearVirtualNodes(virtualNodeCount > 0)
    setClearPath(hasPath)
    setError(null)
  }

  return (
    <div className="island-map-draw-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="island-map-draw-dialog island-map-draw-clear-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="island-map-draw-clear-title"
        onClick={(event) => event.stopPropagation()}
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
              checked={clearVirtualNodes}
              disabled={virtualNodeCount === 0}
              onChange={(event) => setClearVirtualNodes(event.target.checked)}
            />
            <span>{t('islandMapDrawClearIncludeVirtualNodes', { count: virtualNodeCount })}</span>
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
        <div className="island-map-draw-panel-row">
          <button type="button" className="island-map-btn" onClick={selectAll}>
            {t('islandMapDrawClearSelectAll')}
          </button>
        </div>
        {error ? <p className="island-map-draw-export-error">{error}</p> : null}
        <div className="island-map-draw-dialog-actions">
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
