import {
  DEFAULT_FAVORITE_FOLDER_ID,
  type FavoriteFolder,
  type FavoriteFoldersState,
} from '../storage/favoriteFolders'

function cloneFolder(folder: FavoriteFolder): FavoriteFolder {
  return {
    id: folder.id,
    name: folder.name,
    routeIds: [...folder.routeIds],
  }
}

export function countFavoriteRoutes(state: FavoriteFoldersState): number {
  const seen = new Set<string>()
  for (const folder of state.folders) {
    for (const id of folder.routeIds) seen.add(id)
  }
  return seen.size
}

export function mergeFavoriteFolders(
  local: FavoriteFoldersState,
  remote: FavoriteFoldersState,
): FavoriteFoldersState {
  const byId = new Map<string, FavoriteFolder>()

  for (const folder of [...remote.folders, ...local.folders]) {
    const prev = byId.get(folder.id)
    if (!prev) {
      byId.set(folder.id, cloneFolder(folder))
      continue
    }
    byId.set(folder.id, {
      id: folder.id,
      name: prev.name || folder.name,
      routeIds: [...new Set([...prev.routeIds, ...folder.routeIds])],
    })
  }

  const folders = [...byId.values()]
  if (folders.length === 0) {
    return {
      version: 2,
      folders: [{ id: DEFAULT_FAVORITE_FOLDER_ID, name: '', routeIds: [] }],
      activeFolderId: DEFAULT_FAVORITE_FOLDER_ID,
    }
  }

  const activeFolderId = folders.some((folder) => folder.id === local.activeFolderId)
    ? local.activeFolderId
    : folders.some((folder) => folder.id === remote.activeFolderId)
      ? remote.activeFolderId
      : folders[0]!.id

  return { version: 2, folders, activeFolderId }
}
