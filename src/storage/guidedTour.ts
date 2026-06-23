import { readAppPreferences } from './appPreferences'
import {
  detectGuidedTourMode,
  type GuidedTourMode,
} from '../data/guidedTourSteps'
import { readRouteQueryFromLocation } from '../utils/routeNavigation'

export const GUIDED_TOUR_SEEN_KEY = 'sibs-guided-tour-seen'

export function hasSeenGuidedTour(): boolean {
  try {
    return localStorage.getItem(GUIDED_TOUR_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markGuidedTourSeen(): void {
  try {
    localStorage.setItem(GUIDED_TOUR_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearGuidedTourSeen(): void {
  try {
    localStorage.removeItem(GUIDED_TOUR_SEEN_KEY)
  } catch {
    /* ignore */
  }
}

export function shouldShowGuidedTour(): boolean {
  return !hasSeenGuidedTour()
}

/** 自动弹出新手引导的前置条件 */
export function canAutoStartGuidedTour(): boolean {
  return shouldShowGuidedTour() && readAppPreferences().guidedTourAutoStart
}

/** 首次进入时等待界面就绪再弹出（路线详情需等面板动画） */
export function getGuidedTourAutoStartDelayMs(mode: GuidedTourMode = detectGuidedTourMode()): number {
  if (mode === 'brief' && readRouteQueryFromLocation()) return 900
  return 500
}
