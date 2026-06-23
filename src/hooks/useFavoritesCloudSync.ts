import { useEffect, useRef } from 'react'
import { fetchUserData, saveUserData, UserApiError } from '../api/userApi'
import { useAuth } from '../contexts/AuthContext'
import { useFavoriteRoutes } from '../contexts/FavoriteRoutesContext'
import { allFavoriteRouteIds, type FavoriteFoldersState } from '../storage/favoriteFolders'

function buildState(folders: FavoriteFoldersState['folders'], activeFolderId: string): FavoriteFoldersState {
  return { version: 2, folders, activeFolderId }
}

function localFavoriteCount(state: FavoriteFoldersState): number {
  return allFavoriteRouteIds(state).length
}

export function useFavoritesCloudSync() {
  const { token, isLoggedIn } = useAuth()
  const { folders, activeFolderId, replaceFoldersState } = useFavoriteRoutes()
  const hydratedRef = useRef(false)
  const uploadTimerRef = useRef<number | null>(null)
  const skipUploadRef = useRef(false)

  useEffect(() => {
    hydratedRef.current = false
    skipUploadRef.current = false
  }, [token])

  useEffect(() => {
    if (!isLoggedIn || !token) return

    let cancelled = false
    void (async () => {
      try {
        const remote = await fetchUserData(token)
        if (cancelled) return

        const localState = buildState(folders, activeFolderId)
        const remoteCount = remote.favoriteCount
        const localCount = localFavoriteCount(localState)

        if (remote.favorites && remoteCount > 0) {
          skipUploadRef.current = true
          replaceFoldersState(remote.favorites)
        } else if (localCount > 0) {
          await saveUserData(token, localState)
        }
      } catch (error) {
        if (!(error instanceof UserApiError) || error.code !== 'user_api_unconfigured') {
          console.warn('[favorites-sync] initial pull failed', error)
        }
      } finally {
        if (!cancelled) hydratedRef.current = true
      }
    })()

    return () => {
      cancelled = true
    }
    // Only run on login/token change — not on every favorites edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token])

  useEffect(() => {
    if (!isLoggedIn || !token || !hydratedRef.current) return

    if (skipUploadRef.current) {
      skipUploadRef.current = false
      return
    }

    const state = buildState(folders, activeFolderId)
    if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current)
    uploadTimerRef.current = window.setTimeout(() => {
      void saveUserData(token, state).catch((error) => {
        console.warn('[favorites-sync] upload failed', error)
      })
    }, 800)

    return () => {
      if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current)
    }
  }, [folders, activeFolderId, isLoggedIn, token])
}
