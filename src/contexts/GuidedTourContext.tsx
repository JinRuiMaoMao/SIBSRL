import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { deferGuidedTourThisSession } from '../storage/guidedTour'

interface OpenTourOptions {
  manual?: boolean
}

interface GuidedTourContextValue {
  open: boolean
  openTour: (options?: OpenTourOptions) => void
  closeTour: () => void
  deferAutoTour: () => void
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null)

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const manualOpenRef = useRef(false)

  const openTour = useCallback((options?: OpenTourOptions) => {
    manualOpenRef.current = Boolean(options?.manual)
    setOpen(true)
  }, [])

  const closeTour = useCallback(() => {
    manualOpenRef.current = false
    setOpen(false)
  }, [])

  const deferAutoTour = useCallback(() => {
    if (manualOpenRef.current) return
    deferGuidedTourThisSession()
    setOpen(false)
  }, [])

  const value = useMemo(
    () => ({ open, openTour, closeTour, deferAutoTour }),
    [open, openTour, closeTour, deferAutoTour],
  )

  return <GuidedTourContext.Provider value={value}>{children}</GuidedTourContext.Provider>
}

export function useGuidedTourControl() {
  const ctx = useContext(GuidedTourContext)
  if (!ctx) throw new Error('useGuidedTourControl must be used within GuidedTourProvider')
  return ctx
}
