import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  allFavoriteRouteIds,
  createFavoriteFolderId,
  DEFAULT_FAVORITE_FOLDER_ID,
  getActiveFolder,
  readFavoriteFoldersState,
  writeFavoriteFoldersState,
  type FavoriteFolder,
  type FavoriteFoldersState,
} from '../storage/favoriteFolders'

interface FavoriteRoutesContextValue {
  folders: FavoriteFolder[]
  activeFolderId: string
  activeFolder: FavoriteFolder
  /** 当前激活收藏夹内的线路顺序 */
  favorites: string[]
  isFavorite: (routeId: string) => boolean
  folderContains: (folderId: string, routeId: string) => boolean
  foldersContaining: (routeId: string) => FavoriteFolder[]
  setActiveFolderId: (folderId: string) => void
  createFolder: (name: string) => string | null
  renameFolder: (folderId: string, name: string) => void
  deleteFolder: (folderId: string) => boolean
  addToFolder: (routeId: string, folderId: string) => void
  removeFromFolder: (routeId: string, folderId: string) => void
  setRouteFolders: (routeId: string, folderIds: string[]) => void
  reorderFavorites: (dragRouteId: string, targetRouteId: string) => void
  replaceFoldersState: (state: FavoriteFoldersState) => void
}

const FavoriteRoutesContext = createContext<FavoriteRoutesContextValue | null>(null)

function persist(state: FavoriteFoldersState): FavoriteFoldersState {
  writeFavoriteFoldersState(state)
  return state
}

export function FavoriteRoutesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FavoriteFoldersState>(readFavoriteFoldersState)

  const activeFolder = useMemo(() => getActiveFolder(state), [state])
  const favorites = activeFolder.routeIds

  const updateState = useCallback((updater: (prev: FavoriteFoldersState) => FavoriteFoldersState) => {
    setState((prev) => persist(updater(prev)))
  }, [])

  const isFavorite = useCallback(
    (routeId: string) => allFavoriteRouteIds(state).includes(routeId),
    [state],
  )

  const folderContains = useCallback(
    (folderId: string, routeId: string) => {
      const folder = state.folders.find((item) => item.id === folderId)
      return folder?.routeIds.includes(routeId) ?? false
    },
    [state.folders],
  )

  const foldersContaining = useCallback(
    (routeId: string) => state.folders.filter((folder) => folder.routeIds.includes(routeId)),
    [state.folders],
  )

  const setActiveFolderId = useCallback((folderId: string) => {
    updateState((prev) => {
      if (!prev.folders.some((folder) => folder.id === folderId)) return prev
      return { ...prev, activeFolderId: folderId }
    })
  }, [updateState])

  const createFolder = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return null
      const id = createFavoriteFolderId()
      updateState((prev) => ({
        ...prev,
        folders: [...prev.folders, { id, name: trimmed, routeIds: [] }],
        activeFolderId: id,
      }))
      return id
    },
    [updateState],
  )

  const renameFolder = useCallback(
    (folderId: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      updateState((prev) => ({
        ...prev,
        folders: prev.folders.map((folder) =>
          folder.id === folderId ? { ...folder, name: trimmed } : folder,
        ),
      }))
    },
    [updateState],
  )

  const deleteFolder = useCallback(
    (folderId: string) => {
      let deleted = false
      updateState((prev) => {
        if (prev.folders.length <= 1) return prev
        const nextFolders = prev.folders.filter((folder) => folder.id !== folderId)
        if (nextFolders.length === prev.folders.length) return prev
        deleted = true
        const activeFolderId =
          prev.activeFolderId === folderId ? nextFolders[0]!.id : prev.activeFolderId
        return { ...prev, folders: nextFolders, activeFolderId }
      })
      return deleted
    },
    [updateState],
  )

  const addToFolder = useCallback(
    (routeId: string, folderId: string) => {
      const trimmed = routeId.trim()
      if (!trimmed) return
      updateState((prev) => ({
        ...prev,
        folders: prev.folders.map((folder) => {
          if (folder.id !== folderId || folder.routeIds.includes(trimmed)) return folder
          return { ...folder, routeIds: [...folder.routeIds, trimmed] }
        }),
      }))
    },
    [updateState],
  )

  const removeFromFolder = useCallback(
    (routeId: string, folderId: string) => {
      updateState((prev) => ({
        ...prev,
        folders: prev.folders.map((folder) =>
          folder.id === folderId
            ? { ...folder, routeIds: folder.routeIds.filter((id) => id !== routeId) }
            : folder,
        ),
      }))
    },
    [updateState],
  )

  const setRouteFolders = useCallback(
    (routeId: string, folderIds: string[]) => {
      const trimmed = routeId.trim()
      if (!trimmed) return
      const idSet = new Set(folderIds)
      updateState((prev) => ({
        ...prev,
        folders: prev.folders.map((folder) => {
          const has = idSet.has(folder.id)
          const contains = folder.routeIds.includes(trimmed)
          if (has && !contains) {
            return { ...folder, routeIds: [...folder.routeIds, trimmed] }
          }
          if (!has && contains) {
            return { ...folder, routeIds: folder.routeIds.filter((id) => id !== trimmed) }
          }
          return folder
        }),
      }))
    },
    [updateState],
  )

  const reorderFavorites = useCallback(
    (dragRouteId: string, targetRouteId: string) => {
      if (!dragRouteId || !targetRouteId || dragRouteId === targetRouteId) return
      updateState((prev) => {
        const folderId = prev.activeFolderId
        return {
          ...prev,
          folders: prev.folders.map((folder) => {
            if (folder.id !== folderId) return folder
            const fromIndex = folder.routeIds.indexOf(dragRouteId)
            const toIndex = folder.routeIds.indexOf(targetRouteId)
            if (fromIndex < 0 || toIndex < 0) return folder
            const next = [...folder.routeIds]
            const [moved] = next.splice(fromIndex, 1)
            if (!moved) return folder
            next.splice(toIndex, 0, moved)
            return { ...folder, routeIds: next }
          }),
        }
      })
    },
    [updateState],
  )

  const replaceFoldersState = useCallback((next: FavoriteFoldersState) => {
    const folders = next.folders.length > 0 ? next.folders : [{ id: DEFAULT_FAVORITE_FOLDER_ID, name: '', routeIds: [] }]
    const activeFolderId = folders.some((folder) => folder.id === next.activeFolderId)
      ? next.activeFolderId
      : folders[0]!.id
    setState(persist({ version: 2, folders, activeFolderId }))
  }, [])

  const value = useMemo(
    () => ({
      folders: state.folders,
      activeFolderId: state.activeFolderId,
      activeFolder,
      favorites,
      isFavorite,
      folderContains,
      foldersContaining,
      setActiveFolderId,
      createFolder,
      renameFolder,
      deleteFolder,
      addToFolder,
      removeFromFolder,
      setRouteFolders,
      reorderFavorites,
      replaceFoldersState,
    }),
    [
      state.folders,
      state.activeFolderId,
      activeFolder,
      favorites,
      isFavorite,
      folderContains,
      foldersContaining,
      setActiveFolderId,
      createFolder,
      renameFolder,
      deleteFolder,
      addToFolder,
      removeFromFolder,
      setRouteFolders,
      reorderFavorites,
      replaceFoldersState,
    ],
  )

  return (
    <FavoriteRoutesContext.Provider value={value}>{children}</FavoriteRoutesContext.Provider>
  )
}

export function useFavoriteRoutes() {
  const ctx = useContext(FavoriteRoutesContext)
  if (!ctx) {
    throw new Error('useFavoriteRoutes must be used within FavoriteRoutesProvider')
  }
  return ctx
}
