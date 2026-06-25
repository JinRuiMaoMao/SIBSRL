import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyAppPreferences,
  readAppPreferences,
  writeAppPreferences,
  type AppPreferences,
  type ListDensity,
} from '../storage/appPreferences'

interface AppPreferencesContextValue extends AppPreferences {
  setReduceMotion: (value: boolean) => void
  setListDensity: (value: ListDensity) => void
  setGuidedTourAutoStart: (value: boolean) => void
  setPanelFill: (value: number) => void
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null)

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(readAppPreferences)

  const updatePreferences = useCallback((patch: Partial<AppPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch }
      applyAppPreferences(next)
      writeAppPreferences(next)
      return next
    })
  }, [])

  useEffect(() => {
    applyAppPreferences(preferences)
  }, [preferences])

  const value = useMemo(
    () => ({
      reduceMotion: preferences.reduceMotion,
      listDensity: preferences.listDensity,
      guidedTourAutoStart: preferences.guidedTourAutoStart,
      panelFill: preferences.panelFill,
      setReduceMotion: (reduceMotion: boolean) => updatePreferences({ reduceMotion }),
      setListDensity: (listDensity: ListDensity) => updatePreferences({ listDensity }),
      setGuidedTourAutoStart: (guidedTourAutoStart: boolean) =>
        updatePreferences({ guidedTourAutoStart }),
      setPanelFill: (panelFill: number) => updatePreferences({ panelFill }),
    }),
    [
      preferences.guidedTourAutoStart,
      preferences.listDensity,
      preferences.panelFill,
      preferences.reduceMotion,
      updatePreferences,
    ],
  )

  return (
    <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
  )
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext)
  if (!ctx) throw new Error('useAppPreferences must be used within AppPreferencesProvider')
  return ctx
}
