import { useCallback, useEffect, useRef, useState, type AnimationEvent, type ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { RealStartBackground } from './RealStartBackground'
import { RealStartPage } from './RealStartPage'
import { useStartPageBoot } from '../hooks/useStartPageBoot'
import { isAppReduceMotionEnabled } from '../storage/appPreferences'
import { useRealShellHomeMusic } from '../hooks/useRealShellHomeMusic'
import { REAL_SHELL_TRANSITION_MS } from '../utils/realShellTransition'

type RoutesViewPhase = 'start' | 'opening-routes' | 'routes' | 'closing-routes'

interface RealShellHomeViewProps {
  shellTab: 'routes' | null
  routesContent: ReactNode
}

function resolveInitialRoutesPhase(shellTab: 'routes' | null): RoutesViewPhase {
  return shellTab === 'routes' ? 'routes' : 'start'
}

export function RealShellHomeView({ shellTab, routesContent }: RealShellHomeViewProps) {
  const bootReady = useStartPageBoot()
  const [routesPhase, setRoutesPhase] = useState<RoutesViewPhase>(() => resolveInitialRoutesPhase(shellTab))
  const prevShellTabRef = useRef<'routes' | null>(shellTab)
  const skipNextTransitionRef = useRef(shellTab === 'routes')

  const startLayerMounted =
    routesPhase === 'start' || routesPhase === 'opening-routes' || routesPhase === 'closing-routes'
  const routesLayerMounted =
    routesPhase === 'routes' || routesPhase === 'opening-routes' || routesPhase === 'closing-routes'

  useRealShellHomeMusic(routesPhase)

  useEffect(() => {
    const prev = prevShellTabRef.current
    prevShellTabRef.current = shellTab

    if (skipNextTransitionRef.current) {
      skipNextTransitionRef.current = false
      setRoutesPhase(shellTab === 'routes' ? 'routes' : 'start')
      return
    }

    if (prev === null && shellTab === 'routes') {
      setRoutesPhase(isAppReduceMotionEnabled() ? 'routes' : 'opening-routes')
      return
    }

    if (prev === 'routes' && shellTab === null) {
      setRoutesPhase(isAppReduceMotionEnabled() ? 'start' : 'closing-routes')
      return
    }

    setRoutesPhase(shellTab === 'routes' ? 'routes' : 'start')
  }, [shellTab])

  const handleRoutesPanelAnimationEnd = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    const name = event.animationName
    setRoutesPhase((phase) => {
      if (phase === 'opening-routes' && name.includes('real-shell-slide-down-from-top')) {
        return 'routes'
      }
      if (phase === 'closing-routes' && name.includes('real-shell-slide-up-out')) {
        return 'start'
      }
      return phase
    })
  }, [])

  useEffect(() => {
    if (routesPhase !== 'opening-routes' && routesPhase !== 'closing-routes') return
    const timer = window.setTimeout(() => {
      setRoutesPhase((phase) => {
        if (phase === 'opening-routes') return 'routes'
        if (phase === 'closing-routes') return 'start'
        return phase
      })
    }, REAL_SHELL_TRANSITION_MS + 80)
    return () => window.clearTimeout(timer)
  }, [routesPhase])

  return (
    <div
      className={`real-shell-home-stack${bootReady ? ' real-shell-home-stack--ready' : ''}`}
      data-routes-phase={routesPhase}
    >
      <RealStartBackground />
      {startLayerMounted ? (
        <div className="real-shell-home-start-layer">
          <RealStartPage sharedBackground />
        </div>
      ) : null}
      {routesLayerMounted ? (
        <div className="real-shell-home-routes-layer">
          <div className="real-shell-routes-panel" onAnimationEnd={handleRoutesPanelAnimationEnd}>
            <ErrorBoundary>{routesContent}</ErrorBoundary>
          </div>
        </div>
      ) : null}
    </div>
  )
}
