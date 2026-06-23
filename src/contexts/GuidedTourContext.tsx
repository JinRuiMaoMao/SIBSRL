import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface GuidedTourContextValue {
  open: boolean
  openTour: () => void
  closeTour: () => void
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null)

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openTour = useCallback(() => setOpen(true), [])
  const closeTour = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ open, openTour, closeTour }),
    [open, openTour, closeTour],
  )

  return <GuidedTourContext.Provider value={value}>{children}</GuidedTourContext.Provider>
}

export function useGuidedTourControl() {
  const ctx = useContext(GuidedTourContext)
  if (!ctx) throw new Error('useGuidedTourControl must be used within GuidedTourProvider')
  return ctx
}
