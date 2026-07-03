import { useEffect, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { PathConflictGroup, PathConflictResolution } from '../utils/worldMapDrawImportMerge'

interface IslandMapDrawImportConflictDialogProps {
  open: boolean
  conflict: PathConflictGroup | null
  onCancel: () => void
  onConfirm: (resolution: PathConflictResolution) => void
}

type ResolutionKind = PathConflictResolution['kind']

export function IslandMapDrawImportConflictDialog({
  open,
  conflict,
  onCancel,
  onConfirm,
}: IslandMapDrawImportConflictDialogProps) {
  const { t } = useLocale()
  const [kind, setKind] = useState<ResolutionKind>('keepAll')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !conflict) return
    setKind('keepAll')
    setSelectedFileName(conflict.entries[0]?.fileName ?? '')
    setError(null)
  }, [conflict, open])

  if (!open || !conflict) return null

  const handleConfirm = () => {
    if (kind === 'keepFile' && !selectedFileName.trim()) {
      setError(t('islandMapDrawImportConflictNeedFile'))
      return
    }
    if (kind === 'keepFile') {
      onConfirm({ kind: 'keepFile', fileName: selectedFileName })
      return
    }
    if (kind === 'clearPaths') {
      onConfirm({ kind: 'clearPaths' })
      return
    }
    onConfirm({ kind: 'keepAll' })
  }

  return (
    <div className="app-dialog-root island-map-export-dialog-root">
      <button type="button" className="app-dialog-backdrop" aria-hidden onClick={onCancel} />
      <div
        className="app-dialog-panel island-map-export-dialog island-map-draw-import-conflict-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="island-map-import-conflict-title"
      >
        <h2 id="island-map-import-conflict-title" className="app-dialog-title">
          {t('islandMapDrawImportConflictTitle')}
        </h2>
        <p className="app-dialog-message">{t('islandMapDrawImportConflictLead', { routeId: conflict.routeId })}</p>
        <ul className="island-map-export-dialog-merge-list">
          {conflict.entries.map((entry) => (
            <li key={entry.fileName}>
              <span>
                {entry.fileName} ({t('islandMapDrawImportConflictPoints', { count: entry.pointCount })})
              </span>
            </li>
          ))}
        </ul>
        <fieldset className="island-map-export-dialog-fieldset">
          <legend>{t('islandMapDrawImportConflictLegend')}</legend>
          <label className="island-map-export-dialog-check">
            <input
              type="radio"
              name="import-conflict-resolution"
              checked={kind === 'keepAll'}
              onChange={() => setKind('keepAll')}
            />
            <span>{t('islandMapDrawImportConflictKeepAll')}</span>
          </label>
          <label className="island-map-export-dialog-check">
            <input
              type="radio"
              name="import-conflict-resolution"
              checked={kind === 'keepFile'}
              onChange={() => setKind('keepFile')}
            />
            <span>{t('islandMapDrawImportConflictKeepFile')}</span>
          </label>
          {kind === 'keepFile' ? (
            <label className="island-map-export-dialog-route-select">
              <span>{t('islandMapDrawImportConflictFileSelect')}</span>
              <select value={selectedFileName} onChange={(event) => setSelectedFileName(event.target.value)}>
                {conflict.entries.map((entry) => (
                  <option key={entry.fileName} value={entry.fileName}>
                    {entry.fileName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="island-map-export-dialog-check">
            <input
              type="radio"
              name="import-conflict-resolution"
              checked={kind === 'clearPaths'}
              onChange={() => setKind('clearPaths')}
            />
            <span>{t('islandMapDrawImportConflictClearPaths')}</span>
          </label>
        </fieldset>
        {error ? <p className="island-map-draw-export-error">{error}</p> : null}
        <div className="app-dialog-actions">
          <button type="button" className="island-map-btn" onClick={onCancel}>
            {t('islandMapDrawExportCancel')}
          </button>
          <button type="button" className="island-map-btn island-map-btn--export" onClick={handleConfirm}>
            {t('islandMapDrawImportConflictConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
