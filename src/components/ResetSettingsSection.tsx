import { useCallback } from 'react'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import { useFavoriteRoutes } from '../contexts/FavoriteRoutesContext'
import { useRecentRoutes } from '../contexts/RecentRoutesContext'
import { useLocale } from '../i18n/LocaleContext'
import { LOCALE_STORAGE_KEY } from '../i18n/types'
import { APP_PREFERENCES_STORAGE_KEY } from '../storage/appPreferences'
import { DEFAULT_FAVORITE_FOLDER_ID, FAVORITE_FOLDERS_STORAGE_KEY } from '../storage/favoriteFolders'
import { DAILY_CHALLENGE_PROMPT_SEEN_KEY } from '../storage/dailyChallengePrompt'
import { clearSearchHistory, RECENT_ROUTES_STORAGE_KEY } from '../storage/routeActivity'
import {
  FAVORITE_ROUTES_STORAGE_KEY,
  ROUTE_FILTERS_STORAGE_KEY,
  ROUTE_GROUP_OPEN_STORAGE_KEY,
} from '../storage/routePreferences'
import { UPDATES_LAST_SEEN_ID_KEY } from '../storage/updatesViewing'
import { useTheme } from '../theme/ThemeContext'
import { THEME_STORAGE_KEY } from '../theme/types'

export function ResetSettingsSection() {
  const { t } = useLocale()
  const { alert, confirm } = useAppDialog()
  const { setTheme } = useTheme()
  const { replaceFoldersState } = useFavoriteRoutes()
  const { clearRecent } = useRecentRoutes()
  const { setListDensity, setReduceMotion } = useAppPreferences()

  const resetAll = useCallback(async () => {
    const ok = await confirm({ message: t('resetSettingsConfirm'), danger: true })
    if (!ok) return

    try {
      localStorage.removeItem(THEME_STORAGE_KEY)
      localStorage.removeItem(LOCALE_STORAGE_KEY)
      localStorage.removeItem(APP_PREFERENCES_STORAGE_KEY)
      localStorage.removeItem(FAVORITE_ROUTES_STORAGE_KEY)
      localStorage.removeItem(FAVORITE_FOLDERS_STORAGE_KEY)
      localStorage.removeItem(ROUTE_FILTERS_STORAGE_KEY)
      localStorage.removeItem(ROUTE_GROUP_OPEN_STORAGE_KEY)
      localStorage.removeItem(RECENT_ROUTES_STORAGE_KEY)
      localStorage.removeItem(DAILY_CHALLENGE_PROMPT_SEEN_KEY)
      localStorage.removeItem(UPDATES_LAST_SEEN_ID_KEY)
      localStorage.removeItem('sibs-updates-log-viewed')
      localStorage.removeItem('sibs-updates-prompt-shown')
    } catch {
      /* ignore */
    }
    clearSearchHistory()

    setTheme('system')
    setReduceMotion(false)
    setListDensity('comfortable')
    replaceFoldersState({
      version: 2,
      folders: [{ id: DEFAULT_FAVORITE_FOLDER_ID, name: '', routeIds: [] }],
      activeFolderId: DEFAULT_FAVORITE_FOLDER_ID,
    })
    clearRecent()

    await alert({ message: t('resetSettingsDone') })
    window.location.reload()
  }, [alert, clearRecent, confirm, replaceFoldersState, setListDensity, setReduceMotion, setTheme, t])

  return (
    <section className="settings-section">
      <p className="settings-panel-title">{t('resetSettings')}</p>
      <p className="settings-hint">{t('resetSettingsHint')}</p>
      <div className="settings-action-row">
        <button type="button" className="settings-action-btn danger" onClick={() => void resetAll()}>
          {t('resetSettingsAction')}
        </button>
      </div>
    </section>
  )
}
