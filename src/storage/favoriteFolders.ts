import { readStoredFavoriteRouteIds, FAVORITE_ROUTES_STORAGE_KEY } from './routePreferences'

export const FAVORITE_FOLDERS_STORAGE_KEY = 'sibs-favorite-folders'
export const DEFAULT_FAVORITE_FOLDER_ID = 'default'

export interface FavoriteFolder {
  id: string
  name: string
  routeIds: string[]
}

export interface FavoriteFoldersState {
  version: 2
  folders: FavoriteFolder[]
  activeFolderId: string
}

export function createFavoriteFolderId(): string {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function defaultState(routeIds: string[] = []): FavoriteFoldersState {
  return {
    version: 2,
    folders: [
      {
        id: DEFAULT_FAVORITE_FOLDER_ID,
        name: '',
        routeIds: [...routeIds],
      },
    ],
    activeFolderId: DEFAULT_FAVORITE_FOLDER_ID,
  }
}

function normalizeFolder(raw: unknown): FavoriteFolder | null {
  if (!raw || typeof raw !== 'object') return null
  const folder = raw as Partial<FavoriteFolder>
  if (typeof folder.id !== 'string' || !folder.id.trim()) return null
  const routeIds = Array.isArray(folder.routeIds)
    ? folder.routeIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : []
  return {
    id: folder.id.trim(),
    name: typeof folder.name === 'string' ? folder.name.trim() : '',
    routeIds,
  }
}

export function readFavoriteFoldersState(): FavoriteFoldersState {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITE_FOLDERS_STORAGE_KEY) ?? 'null')
    if (stored?.version === 2 && Array.isArray(stored.folders)) {
      const folders = (stored.folders as unknown[])
        .map(normalizeFolder)
        .filter((folder): folder is FavoriteFolder => folder != null)
      if (folders.length === 0) return defaultState()

      const activeFolderId =
        typeof stored.activeFolderId === 'string' &&
        folders.some((folder) => folder.id === stored.activeFolderId)
          ? stored.activeFolderId
          : folders[0]!.id

      return { version: 2, folders, activeFolderId }
    }
  } catch {
    /* fall through to migration */
  }

  const legacyIds = readStoredFavoriteRouteIds()
  const migrated = defaultState(legacyIds)
  writeFavoriteFoldersState(migrated)
  return migrated
}

export function writeFavoriteFoldersState(state: FavoriteFoldersState): void {
  try {
    localStorage.setItem(FAVORITE_FOLDERS_STORAGE_KEY, JSON.stringify(state))
    localStorage.removeItem(FAVORITE_ROUTES_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function getActiveFolder(state: FavoriteFoldersState): FavoriteFolder {
  return (
    state.folders.find((folder) => folder.id === state.activeFolderId) ??
    state.folders[0]!
  )
}

export function allFavoriteRouteIds(state: FavoriteFoldersState): string[] {
  const seen = new Set<string>()
  for (const folder of state.folders) {
    for (const id of folder.routeIds) seen.add(id)
  }
  return [...seen]
}
