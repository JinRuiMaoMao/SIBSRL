export const RECENT_ROUTES_STORAGE_KEY = 'sibs-recent-routes'
export const SEARCH_HISTORY_STORAGE_KEY = 'sibs-search-history'

export const MAX_RECENT_ROUTES = 10
export const MAX_SEARCH_HISTORY = 8

export function readRecentRouteIds(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_ROUTES_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  } catch {
    return []
  }
}

export function writeRecentRouteIds(ids: string[]): void {
  try {
    localStorage.setItem(RECENT_ROUTES_STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_RECENT_ROUTES)))
  } catch {
    /* ignore */
  }
}

export function pushRecentRouteId(routeId: string, current: string[]): string[] {
  const trimmed = routeId.trim()
  if (!trimmed) return current
  const next = [trimmed, ...current.filter((id) => id !== trimmed)].slice(0, MAX_RECENT_ROUTES)
  writeRecentRouteIds(next)
  return next
}

export function readSearchHistory(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  } catch {
    return []
  }
}

export function writeSearchHistory(items: string[]): void {
  try {
    localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_SEARCH_HISTORY)),
    )
  } catch {
    /* ignore */
  }
}

export function pushSearchHistory(query: string, current: string[]): string[] {
  const trimmed = query.trim()
  if (!trimmed) return current
  const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, MAX_SEARCH_HISTORY)
  writeSearchHistory(next)
  return next
}

export function clearSearchHistory(): void {
  writeSearchHistory([])
}

import type { FavoriteFoldersState } from './favoriteFolders'
import { DEFAULT_FAVORITE_FOLDER_ID, readFavoriteFoldersState } from './favoriteFolders'

export interface FavoritesExportPayloadV1 {
  version: 1
  favorites: string[]
}

export interface FavoritesExportPayloadV2 {
  version: 2
  folders: { id: string; name: string; routeIds: string[] }[]
  activeFolderId: string
}

export type FavoritesExportPayload = FavoritesExportPayloadV1 | FavoritesExportPayloadV2

export function parseFavoritesImport(raw: string): FavoriteFoldersState {
  const trimmed = raw.trim()
  if (!trimmed) {
    return readFavoriteFoldersState()
  }

  const parsed = JSON.parse(trimmed) as unknown
  if (Array.isArray(parsed)) {
    return {
      version: 2,
      folders: [{ id: DEFAULT_FAVORITE_FOLDER_ID, name: '', routeIds: parsed.filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0,
      ) }],
      activeFolderId: DEFAULT_FAVORITE_FOLDER_ID,
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid format')
  }

  if ((parsed as FavoritesExportPayloadV1).version === 1) {
    const favorites = (parsed as FavoritesExportPayloadV1).favorites.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0,
    )
    return {
      version: 2,
      folders: [{ id: DEFAULT_FAVORITE_FOLDER_ID, name: '', routeIds: favorites }],
      activeFolderId: DEFAULT_FAVORITE_FOLDER_ID,
    }
  }

  if ((parsed as FavoritesExportPayloadV2).version === 2) {
    const payload = parsed as FavoritesExportPayloadV2
    const folders = (payload.folders ?? [])
      .map((folder) => ({
        id: typeof folder.id === 'string' ? folder.id.trim() : '',
        name: typeof folder.name === 'string' ? folder.name.trim() : '',
        routeIds: Array.isArray(folder.routeIds)
          ? folder.routeIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          : [],
      }))
      .filter((folder) => folder.id)
    if (folders.length === 0) throw new Error('invalid format')
    const activeFolderId =
      typeof payload.activeFolderId === 'string' &&
      folders.some((folder) => folder.id === payload.activeFolderId)
        ? payload.activeFolderId
        : folders[0]!.id
    return { version: 2, folders, activeFolderId }
  }

  throw new Error('invalid format')
}

export function buildFavoritesExport(state: FavoriteFoldersState): string {
  const payload: FavoritesExportPayloadV2 = {
    version: 2,
    folders: state.folders,
    activeFolderId: state.activeFolderId,
  }
  return JSON.stringify(payload, null, 2)
}
