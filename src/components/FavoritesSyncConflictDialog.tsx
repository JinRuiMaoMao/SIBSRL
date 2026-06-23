import { useLocale } from '../i18n/LocaleContext'
import type { FavoriteFoldersState } from '../storage/favoriteFolders'
import { countFavoriteRoutes } from '../utils/favoriteFoldersMerge'

export type FavoritesSyncChoice = 'cloud' | 'local' | 'merge'

interface FavoritesSyncConflictDialogProps {
  local: FavoriteFoldersState
  remote: FavoriteFoldersState
  onChoose: (choice: FavoritesSyncChoice) => void
}

export function FavoritesSyncConflictDialog({
  local,
  remote,
  onChoose,
}: FavoritesSyncConflictDialogProps) {
  const { t } = useLocale()

  return (
    <div className="app-dialog-root">
      <button type="button" className="app-dialog-backdrop" aria-hidden onClick={() => onChoose('cloud')} />
      <div
        className="app-dialog-panel favorites-sync-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorites-sync-title"
      >
        <h2 id="favorites-sync-title" className="app-dialog-title">
          {t('favoritesSyncConflictTitle')}
        </h2>
        <p className="app-dialog-message">{t('favoritesSyncConflictLead')}</p>
        <ul className="favorites-sync-stats">
          <li>{t('favoritesSyncLocalCount', { count: countFavoriteRoutes(local) })}</li>
          <li>{t('favoritesSyncCloudCount', { count: countFavoriteRoutes(remote) })}</li>
        </ul>
        <div className="app-dialog-actions favorites-sync-actions">
          <button type="button" className="app-dialog-btn" onClick={() => onChoose('cloud')}>
            {t('favoritesSyncUseCloud')}
          </button>
          <button type="button" className="app-dialog-btn" onClick={() => onChoose('local')}>
            {t('favoritesSyncUseLocal')}
          </button>
          <button
            type="button"
            className="app-dialog-btn app-dialog-btn--primary"
            onClick={() => onChoose('merge')}
          >
            {t('favoritesSyncMerge')}
          </button>
        </div>
      </div>
    </div>
  )
}
