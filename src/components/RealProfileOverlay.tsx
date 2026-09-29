import { useCallback, useEffect, useState, type AnimationEvent } from 'react'
import { createPortal } from 'react-dom'
import { isAppReduceMotionEnabled } from '../storage/appPreferences'
import {
  REAL_HUD_EVENT,
  readRealHudAction,
  type RealProfileHudTab,
} from '../utils/realHudEvents'
import { isRealShellRoutesActive } from '../utils/realShellRoutesPhase'
import { REAL_SHELL_TRANSITION_MS } from '../utils/realShellTransition'
import { RealProfilePage } from './RealProfilePage'

type OverlayViewPhase = 'closed' | 'opening' | 'open' | 'closing'

export function RealProfileOverlay() {
  const [profilePhase, setProfilePhase] = useState<OverlayViewPhase>('closed')
  const [profileInitialTab, setProfileInitialTab] = useState<RealProfileHudTab>('stats')
  const profileMounted = profilePhase !== 'closed'

  const openProfile = useCallback((tab: RealProfileHudTab = 'stats') => {
    setProfileInitialTab(tab)
    if (isAppReduceMotionEnabled()) {
      setProfilePhase('open')
      return
    }
    setProfilePhase('opening')
  }, [])

  useEffect(() => {
    const onHudAction = (event: Event) => {
      const action = readRealHudAction(event)
      if (action?.type === 'open-profile' && isRealShellRoutesActive()) {
        openProfile(action.tab ?? 'stats')
      }
    }
    window.addEventListener(REAL_HUD_EVENT, onHudAction)
    return () => window.removeEventListener(REAL_HUD_EVENT, onHudAction)
  }, [openProfile])

  const closeProfile = useCallback(() => {
    if (profilePhase === 'closed' || profilePhase === 'closing') return
    if (isAppReduceMotionEnabled()) {
      setProfilePhase('closed')
      return
    }
    setProfilePhase('closing')
  }, [profilePhase])

  const handleProfileAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return
      const name = event.animationName
      if (profilePhase === 'opening' && name.includes('real-shell-slide-up-from-bottom')) {
        setProfilePhase('open')
      } else if (profilePhase === 'closing' && name.includes('real-shell-slide-down-out')) {
        setProfilePhase('closed')
      }
    },
    [profilePhase],
  )

  useEffect(() => {
    if (profilePhase !== 'opening' && profilePhase !== 'closing') return
    const timer = window.setTimeout(() => {
      setProfilePhase((phase) => {
        if (phase === 'opening') return 'open'
        if (phase === 'closing') return 'closed'
        return phase
      })
    }, REAL_SHELL_TRANSITION_MS + 80)
    return () => window.clearTimeout(timer)
  }, [profilePhase])

  if (!profileMounted) return null

  return createPortal(
    <div className="real-profile-overlay-host" data-profile-phase={profilePhase}>
      <RealProfilePage
        initialTab={profileInitialTab}
        onClose={closeProfile}
        onAnimationEnd={handleProfileAnimationEnd}
      />
    </div>,
    document.body,
  )
}
