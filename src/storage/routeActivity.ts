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

export interface FavoritesExportPayload {
  version: 1
  favorites: string[]
}

export function parseFavoritesImport(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const parsed = JSON.parse(trimmed) as unknown
  if (Array.isArray(parsed)) {
    return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  }

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as FavoritesExportPayload).favorites)) {
    return (parsed as FavoritesExportPayload).favorites.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0,
    )
  }

  throw new Error('invalid format')
}

export function buildFavoritesExport(favorites: string[]): string {
  const payload: FavoritesExportPayload = { version: 1, favorites }
  return JSON.stringify(payload, null, 2)
}
