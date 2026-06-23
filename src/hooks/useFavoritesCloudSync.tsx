import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { fetchUserData, saveUserData, UserApiError } from '../api/userApi'
import { FavoritesSyncConflictDialog, type FavoritesSyncChoice } from '../components/FavoritesSyncConflictDialog'
import { useAuth } from '../contexts/AuthContext'
import { useFavoriteRoutes } from '../contexts/FavoriteRoutesContext'
import { readFavoriteFoldersState, type FavoriteFoldersState } from '../storage/favoriteFolders'
import { countFavoriteRoutes, favoriteFoldersContentEqual, mergeFavoriteFolders } from '../utils/favoriteFoldersMerge'

function buildState(folders: FavoriteFoldersState['folders'], activeFolderId: string): FavoriteFoldersState {
  return { version: 2, folders, activeFolderId }
}

function readLocalFavoriteState(): FavoriteFoldersState {
  return readFavoriteFoldersState()
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof UserApiError && error.code === 'unauthorized'
}

function isAborted(error: unknown): boolean {
  return error instanceof UserApiError && error.code === 'aborted'
}

export function useFavoritesCloudSync(): ReactNode {
  const { token, isLoggedIn, logout } = useAuth()
  const { folders, activeFolderId, replaceFoldersState } = useFavoriteRoutes()
  const tokenRef = useRef(token)
  tokenRef.current = token

  const foldersRef = useRef(folders)
  const activeFolderIdRef = useRef(activeFolderId)
  foldersRef.current = folders
  activeFolderIdRef.current = activeFolderId

  const hydratedRef = useRef(false)
  const uploadTimerRef = useRef<number | null>(null)
  const skipUploadRef = useRef(false)
  const syncAbortRef = useRef<AbortController | null>(null)
  const [syncReady, setSyncReady] = useState(false)
  const [conflict, setConflict] = useState<{
    local: FavoriteFoldersState
    remote: FavoriteFoldersState
  } | null>(null)
  const conflictResolverRef = useRef<((choice: FavoritesSyncChoice) => void) | null>(null)
  const cancelConflictRef = useRef<(() => void) | null>(null)

  const handleUnauthorized = useCallback(
    (error: unknown, requestToken: string | null) => {
      if (!isUnauthorized(error)) return false
      if (!requestToken || requestToken !== tokenRef.current) return false
      logout()
      return true
    },
    [logout],
  )

  useEffect(() => {
    syncAbortRef.current?.abort()
    syncAbortRef.current = null
    cancelConflictRef.current?.()
    cancelConflictRef.current = null
    conflictResolverRef.current = null
    if (uploadTimerRef.current) {
      window.clearTimeout(uploadTimerRef.current)
      uploadTimerRef.current = null
    }
    hydratedRef.current = false
    skipUploadRef.current = false
    setSyncReady(false)
    setConflict(null)
  }, [token])

  useEffect(() => {
    if (!isLoggedIn || !token) return

    const syncToken = token
    const abort = new AbortController()
    syncAbortRef.current = abort
    let cancelled = false

    void (async () => {
      try {
        const remote = await fetchUserData(syncToken, abort.signal)
        if (cancelled || syncToken !== tokenRef.current) return

        const localState = readLocalFavoriteState()
        const remoteState = remote.favorites
        const remoteCount = remote.favoriteCount
        const localCount = countFavoriteRoutes(localState)

        if (
          remoteState &&
          remoteCount > 0 &&
          localCount > 0 &&
          !favoriteFoldersContentEqual(localState, remoteState)
        ) {
          let choice: FavoritesSyncChoice
          try {
            choice = await new Promise<FavoritesSyncChoice>((resolve, reject) => {
              conflictResolverRef.current = resolve
              cancelConflictRef.current = () => {
                conflictResolverRef.current = null
                cancelConflictRef.current = null
                reject(new Error('favorites-sync-cancelled'))
              }
              setConflict({ local: localState, remote: remoteState })
            })
          } catch {
            return
          }
          conflictResolverRef.current = null
          cancelConflictRef.current = null
          if (cancelled || syncToken !== tokenRef.current) return

          let nextState = localState
          if (choice === 'cloud') {
            nextState = remoteState
          } else if (choice === 'merge') {
            nextState = mergeFavoriteFolders(localState, remoteState)
          }
          skipUploadRef.current = true
          replaceFoldersState(nextState)
          await saveUserData(syncToken, nextState, abort.signal)
        } else if (remoteState && remoteCount > 0 && localCount === 0) {
          skipUploadRef.current = true
          replaceFoldersState(remoteState)
        } else if (localCount > 0 && remoteCount === 0) {
          await saveUserData(syncToken, localState, abort.signal)
        }
      } catch (error) {
        if (cancelled || abort.signal.aborted || isAborted(error)) return
        if (syncToken !== tokenRef.current) return
        if (handleUnauthorized(error, syncToken)) return
        if (!(error instanceof UserApiError) || error.code !== 'user_api_unconfigured') {
          console.warn('[favorites-sync] initial pull failed', error)
        }
      } finally {
        if (!cancelled && syncToken === tokenRef.current) {
          hydratedRef.current = true
          setSyncReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
      abort.abort()
      if (syncAbortRef.current === abort) {
        syncAbortRef.current = null
      }
    }
    // Only run on login/token change — not on every favorites edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token])

  useEffect(() => {
    if (!isLoggedIn || !token || !syncReady || !hydratedRef.current) return

    if (skipUploadRef.current) {
      skipUploadRef.current = false
      return
    }

    const uploadToken = token
    const state = buildState(foldersRef.current, activeFolderIdRef.current)
    if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current)
    uploadTimerRef.current = window.setTimeout(() => {
      void saveUserData(uploadToken, state).catch((error) => {
        if (handleUnauthorized(error, uploadToken)) return
        console.warn('[favorites-sync] upload failed', error)
      })
    }, 800)

    return () => {
      if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current)
    }
  }, [folders, activeFolderId, isLoggedIn, token, syncReady, handleUnauthorized])

  if (!conflict) return null

  return (
    <FavoritesSyncConflictDialog
      local={conflict.local}
      remote={conflict.remote}
      onChoose={(choice) => {
        cancelConflictRef.current = null
        conflictResolverRef.current?.(choice)
        conflictResolverRef.current = null
        setConflict(null)
      }}
    />
  )
}
