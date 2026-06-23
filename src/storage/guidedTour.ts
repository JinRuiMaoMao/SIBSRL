import { detectGuidedTourMode, entryForGuidedTourMode, type GuidedTourMode } from '../data/guidedTourSteps'
import { readAppPreferences } from './appPreferences'
import { readRouteQueryFromLocation } from '../utils/routeNavigation'

export const GUIDED_TOUR_SEEN_KEY = 'sibs-guided-tour-seen'
export const GUIDED_TOUR_SEEN_ENTRIES_KEY = 'sibs-guided-tour-seen-entries'

export type GuidedTourSeenEntry = 'full' | 'brief'

function readSeenEntries(): Set<GuidedTourSeenEntry> {
  try {
    const raw = localStorage.getItem(GUIDED_TOUR_SEEN_ENTRIES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return new Set(
          parsed.filter((entry): entry is GuidedTourSeenEntry => entry === 'full' || entry === 'brief'),
        )
      }
    }
    // 旧版只记录单一「已看过」；当时仅有线路列表完整引导，故只视为 full 已看。
    if (localStorage.getItem(GUIDED_TOUR_SEEN_KEY) === '1') {
      return new Set(['full'])
    }
    return new Set()
  } catch {
    return new Set()
  }
}

function writeSeenEntries(entries: Set<GuidedTourSeenEntry>): void {
  try {
    localStorage.setItem(GUIDED_TOUR_SEEN_ENTRIES_KEY, JSON.stringify([...entries]))
    if (entries.has('full') && entries.has('brief')) {
      localStorage.setItem(GUIDED_TOUR_SEEN_KEY, '1')
    }
  } catch {
    /* ignore */
  }
}

export function hasSeenGuidedTourEntry(entry: GuidedTourSeenEntry): boolean {
  return readSeenEntries().has(entry)
}

export function markGuidedTourEntrySeen(entry: GuidedTourSeenEntry): void {
  const entries = readSeenEntries()
  entries.add(entry)
  writeSeenEntries(entries)
}

export function hasSeenGuidedTour(): boolean {
  const entries = readSeenEntries()
  return entries.has('full') && entries.has('brief')
}

export function markGuidedTourSeen(mode: GuidedTourMode = detectGuidedTourMode()): void {
  markGuidedTourEntrySeen(entryForGuidedTourMode(mode))
}

export function clearGuidedTourSeen(): void {
  try {
    localStorage.removeItem(GUIDED_TOUR_SEEN_KEY)
    localStorage.removeItem(GUIDED_TOUR_SEEN_ENTRIES_KEY)
  } catch {
    /* ignore */
  }
}

export function shouldShowGuidedTour(mode: GuidedTourMode = detectGuidedTourMode()): boolean {
  return !hasSeenGuidedTourEntry(entryForGuidedTourMode(mode))
}

/** 自动弹出新手引导的前置条件 */
export function canAutoStartGuidedTour(mode: GuidedTourMode = detectGuidedTourMode()): boolean {
  return readAppPreferences().guidedTourAutoStart && shouldShowGuidedTour(mode)
}

/** 首次进入时等待界面就绪再弹出（路线详情需等面板动画） */
export function getGuidedTourAutoStartDelayMs(mode: GuidedTourMode = detectGuidedTourMode()): number {
  if (mode === 'brief' && readRouteQueryFromLocation()) return 1200
  return 500
}
