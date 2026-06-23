import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { detectGuidedTourContext, type GuidedTourContext } from '../data/guidedTourSteps'

interface OpenTourOptions {
  manual?: boolean
  mode?: GuidedTourContext
}

interface GuidedTourContextValue {
  open: boolean
  tourMode: GuidedTourContext
  openTour: (options?: OpenTourOptions) => void
  closeTour: () => void
  registerAutoStartTimer: (timerId: number) => void
  cancelAutoStartTimer: () => void
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null)

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [tourMode, setTourMode] = useState<GuidedTourContext>('routes-list')
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
    const mode = options?.mode ?? detectGuidedTourContext()
    setTourMode(mode)
    setOpen(true)
  }, [])

  const closeTour = useCallback(() => {
    setOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      open,
      tourMode,
      openTour,
      closeTour,
      registerAutoStartTimer,
      cancelAutoStartTimer,
    }),
    [open, tourMode, openTour, closeTour, registerAutoStartTimer, cancelAutoStartTimer],
  )

  return <GuidedTourContext.Provider value={value}>{children}</GuidedTourContext.Provider>
}

export function useGuidedTourControl() {
  const ctx = useContext(GuidedTourContext)
  if (!ctx) throw new Error('useGuidedTourControl must be used within GuidedTourProvider')
  return ctx
}
