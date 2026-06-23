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
  registerAutoStartTimer: (timerId: number) => void
  cancelAutoStartTimer: () => void
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null)

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const manualOpenRef = useRef(false)
  const autoStartTimerRef = useRef<number | null>(null)

  const cancelAutoStartTimer = useCallback(() => {
    if (autoStartTimerRef.current != null) {
      window.clearTimeout(autoStartTimerRef.current)
      autoStartTimerRef.current = null
    }
  }, [])

  const registerAutoStartTimer = useCallback(
    (timerId: number) => {
      cancelAutoStartTimer()
      autoStartTimerRef.current = timerId
    },
    [cancelAutoStartTimer],
  )

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
    cancelAutoStartTimer()
    deferGuidedTourThisSession()
    setOpen(false)
  }, [cancelAutoStartTimer])

  const value = useMemo(
    () => ({
      open,
      openTour,
      closeTour,
      deferAutoTour,
      registerAutoStartTimer,
      cancelAutoStartTimer,
    }),
    [open, openTour, closeTour, deferAutoTour, registerAutoStartTimer, cancelAutoStartTimer],
  )

  return <GuidedTourContext.Provider value={value}>{children}</GuidedTourContext.Provider>
}

export function useGuidedTourControl() {
  const ctx = useContext(GuidedTourContext)
  if (!ctx) throw new Error('useGuidedTourControl must be used within GuidedTourProvider')
  return ctx
}
