import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  pushRecentRouteId,
  readRecentRouteIds,
  writeRecentRouteIds,
} from '../storage/routeActivity'

interface RecentRoutesContextValue {
  recentIds: string[]
  recordRecent: (routeId: string) => void
  clearRecent: () => void
}

const RecentRoutesContext = createContext<RecentRoutesContextValue | null>(null)

export function RecentRoutesProvider({ children }: { children: ReactNode }) {
  const [recentIds, setRecentIds] = useState<string[]>(readRecentRouteIds)

  const recordRecent = useCallback((routeId: string) => {
    setRecentIds((prev) => pushRecentRouteId(routeId, prev))
  }, [])

  const clearRecent = useCallback(() => {
    writeRecentRouteIds([])
    setRecentIds([])
  }, [])

  const value = useMemo(
    () => ({ recentIds, recordRecent, clearRecent }),
    [recentIds, recordRecent, clearRecent],
  )

  return <RecentRoutesContext.Provider value={value}>{children}</RecentRoutesContext.Provider>
}

export function useRecentRoutes() {
  const ctx = useContext(RecentRoutesContext)
  if (!ctx) throw new Error('useRecentRoutes must be used within RecentRoutesProvider')
  return ctx
}
