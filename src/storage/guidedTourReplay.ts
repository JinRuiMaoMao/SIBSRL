import {
  GUIDED_TOUR_CONTEXTS,
  type GuidedTourContext,
} from '../data/guidedTourSteps'
import { getTabPageHref } from '../utils/appTabNavigation'

export const GUIDED_TOUR_REPLAY_SESSION_KEY = 'sibs-guided-tour-replay-session'
export const GUIDED_TOUR_REPLAY_PENDING_KEY = 'sibs-guided-tour-replay-pending'

function isGuidedTourContext(value: string): value is GuidedTourContext {
  return (GUIDED_TOUR_CONTEXTS as string[]).includes(value)
}

export function isGuidedTourReplaySessionActive(): boolean {
  try {
    return sessionStorage.getItem(GUIDED_TOUR_REPLAY_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function beginGuidedTourReplayFromSettings(): void {
  try {
    sessionStorage.setItem(GUIDED_TOUR_REPLAY_SESSION_KEY, '1')
    sessionStorage.setItem(GUIDED_TOUR_REPLAY_PENDING_KEY, 'routes-list')
  } catch {
    /* ignore */
  }
  window.location.assign(getTabPageHref('routes'))
}

export function consumePendingGuidedTourReplay(): GuidedTourContext | null {
  try {
    const raw = sessionStorage.getItem(GUIDED_TOUR_REPLAY_PENDING_KEY)
    if (!raw) return null
    sessionStorage.removeItem(GUIDED_TOUR_REPLAY_PENDING_KEY)
    return isGuidedTourContext(raw) ? raw : 'routes-list'
  } catch {
    return null
  }
}

export function endGuidedTourReplaySession(): void {
  try {
    sessionStorage.removeItem(GUIDED_TOUR_REPLAY_SESSION_KEY)
    sessionStorage.removeItem(GUIDED_TOUR_REPLAY_PENDING_KEY)
  } catch {
    /* ignore */
  }
}
