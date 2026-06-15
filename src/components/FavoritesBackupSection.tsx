import { useCallback, useState } from 'react'
import { useFavoriteRoutes } from '../contexts/FavoriteRoutesContext'
import { useLocale } from '../i18n/LocaleContext'
import { buildFavoritesExport, parseFavoritesImport } from '../storage/routeActivity'

export function FavoritesBackupSection() {
  const { t } = useLocale()
  const { favorites, replaceFavorites } = useFavoriteRoutes()
  const [importText, setImportText] = useState('')
  const [status, setStatus] = useState<'idle' | 'copied' | 'imported' | 'error'>('idle')

  const handleExport = useCallback(async () => {
    const text = buildFavoritesExport(favorites)
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      setImportText(text)
      setStatus('copied')
    }
    window.setTimeout(() => setStatus('idle'), 1600)
  }, [favorites])

  const handleImport = useCallback(() => {
    try {
      const ids = parseFavoritesImport(importText)
      replaceFavorites(ids)
      setImportText('')
      setStatus('imported')
      window.setTimeout(() => setStatus('idle'), 1600)
    } catch {
      setStatus('error')
      window.setTimeout(() => setStatus('idle'), 2000)
    }
  }, [importText, replaceFavorites])

  return (
    <section className="settings-section">
      <p className="settings-panel-title">{t('favoritesBackup')}</p>
      <p className="settings-hint">{t('favoritesBackupHint')}</p>
      <div className="settings-action-row">
        <button type="button" className="settings-action-btn" onClick={() => void handleExport()}>
          {status === 'copied' ? t('favoritesExportCopied') : t('favoritesExport')}
        </button>
      </div>
      <label className="settings-field-label" htmlFor="favorites-import">
        {t('favoritesImport')}
      </label>
      <textarea
        id="favorites-import"
        className="settings-textarea"
        rows={4}
        value={importText}
        placeholder={t('favoritesImportPlaceholder')}
        onChange={(event) => setImportText(event.target.value)}
      />
      <div className="settings-action-row">
        <button
          type="button"
          className="settings-action-btn"
          disabled={!importText.trim()}
          onClick={handleImport}
        >
          {status === 'imported'
            ? t('favoritesImportDone')
            : status === 'error'
              ? t('favoritesImportError')
              : t('favoritesImportApply')}
        </button>
      </div>
    </section>
  )
}
