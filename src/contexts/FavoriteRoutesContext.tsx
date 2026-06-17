import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  readStoredFavoriteRouteIds,
  writeStoredFavoriteRouteIds,
} from '../storage/routePreferences'

interface FavoriteRoutesContextValue {
  favorites: string[]
  isFavorite: (routeId: string) => boolean
  toggleFavorite: (routeId: string) => void
  replaceFavorites: (routeIds: string[]) => void
  reorderFavorites: (dragRouteId: string, targetRouteId: string) => void
}

const FavoriteRoutesContext = createContext<FavoriteRoutesContextValue | null>(null)

export function FavoriteRoutesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(readStoredFavoriteRouteIds)

  const isFavorite = useCallback(
    (routeId: string) => favorites.includes(routeId),
    [favorites],
  )

  const toggleFavorite = useCallback((routeId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId]
      writeStoredFavoriteRouteIds(next)
      return next
    })
  }, [])

  const replaceFavorites = useCallback((routeIds: string[]) => {
    const next = [...new Set(routeIds.map((id) => id.trim()).filter(Boolean))]
    writeStoredFavoriteRouteIds(next)
    setFavorites(next)
  }, [])

  const reorderFavorites = useCallback((dragRouteId: string, targetRouteId: string) => {
    if (!dragRouteId || !targetRouteId || dragRouteId === targetRouteId) return
    setFavorites((prev) => {
      const fromIndex = prev.indexOf(dragRouteId)
      const toIndex = prev.indexOf(targetRouteId)
      if (fromIndex < 0 || toIndex < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      if (!moved) return prev
      next.splice(toIndex, 0, moved)
      writeStoredFavoriteRouteIds(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, replaceFavorites, reorderFavorites }),
    [favorites, isFavorite, toggleFavorite, replaceFavorites, reorderFavorites],
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
