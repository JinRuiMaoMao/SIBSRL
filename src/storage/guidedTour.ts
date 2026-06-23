import {
  detectGuidedTourContext,
  entryForGuidedTourContext,
  GUIDED_TOUR_CONTEXTS,
  type GuidedTourContext,
} from '../data/guidedTourSteps'
import { readAppPreferences } from './appPreferences'

export const GUIDED_TOUR_SEEN_KEY = 'sibs-guided-tour-seen'
export const GUIDED_TOUR_SEEN_ENTRIES_KEY = 'sibs-guided-tour-seen-entries'
export const GUIDED_TOUR_SEEN_CONTEXTS_KEY = 'sibs-guided-tour-seen-contexts'

/** @deprecated legacy entry type */
export type GuidedTourSeenEntry = 'full' | 'brief'

function isGuidedTourContext(value: unknown): value is GuidedTourContext {
  return typeof value === 'string' && (GUIDED_TOUR_CONTEXTS as string[]).includes(value)
}

function migrateLegacySeenEntries(seen: Set<GuidedTourContext>): void {
  try {
    const legacyRaw = localStorage.getItem(GUIDED_TOUR_SEEN_ENTRIES_KEY)
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as unknown
      if (Array.isArray(parsed)) {
        if (parsed.includes('full')) seen.add('routes-list')
      }
    }

    if (localStorage.getItem(GUIDED_TOUR_SEEN_KEY) === '1') {
      for (const context of GUIDED_TOUR_CONTEXTS) {
        seen.add(context)
      }
    }
  } catch {
    /* ignore */
  }
}

function readSeenContexts(): Set<GuidedTourContext> {
  try {
    const raw = localStorage.getItem(GUIDED_TOUR_SEEN_CONTEXTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        const seen = new Set(parsed.filter(isGuidedTourContext))
        migrateLegacySeenEntries(seen)
        return seen
      }
    }

    const seen = new Set<GuidedTourContext>()
    migrateLegacySeenEntries(seen)
    return seen
  } catch {
    return new Set()
  }
}

function writeSeenContexts(contexts: Set<GuidedTourContext>): void {
  try {
    localStorage.setItem(GUIDED_TOUR_SEEN_CONTEXTS_KEY, JSON.stringify([...contexts]))
    if (GUIDED_TOUR_CONTEXTS.every((context) => contexts.has(context))) {
      localStorage.setItem(GUIDED_TOUR_SEEN_KEY, '1')
    }
  } catch {
    /* ignore */
  }
}

export function hasSeenGuidedTourContext(context: GuidedTourContext): boolean {
  return readSeenContexts().has(context)
}

/** @deprecated use hasSeenGuidedTourContext */
export function hasSeenGuidedTourEntry(entry: GuidedTourSeenEntry): boolean {
  if (entry === 'full') return hasSeenGuidedTourContext('routes-list')
  return false
}

export function markGuidedTourContextSeen(context: GuidedTourContext): void {
  const contexts = readSeenContexts()
  contexts.add(context)
  writeSeenContexts(contexts)
}

/** @deprecated use markGuidedTourContextSeen */
export function markGuidedTourEntrySeen(entry: GuidedTourSeenEntry): void {
  if (entry === 'full') markGuidedTourContextSeen('routes-list')
}

export function hasSeenGuidedTour(): boolean {
  const contexts = readSeenContexts()
  return GUIDED_TOUR_CONTEXTS.every((context) => contexts.has(context))
}

export function markGuidedTourSeen(context: GuidedTourContext = detectGuidedTourContext()): void {
  markGuidedTourContextSeen(entryForGuidedTourContext(context))
}

export function clearGuidedTourSeen(): void {
  try {
    localStorage.removeItem(GUIDED_TOUR_SEEN_KEY)
    localStorage.removeItem(GUIDED_TOUR_SEEN_ENTRIES_KEY)
    localStorage.removeItem(GUIDED_TOUR_SEEN_CONTEXTS_KEY)
  } catch {
    /* ignore */
  }
}

export function shouldShowGuidedTour(context: GuidedTourContext = detectGuidedTourContext()): boolean {
  return !hasSeenGuidedTourContext(context)
}

/** 自动弹出新手引导的前置条件 */
export function canAutoStartGuidedTour(context: GuidedTourContext = detectGuidedTourContext()): boolean {
  return readAppPreferences().guidedTourAutoStart && shouldShowGuidedTour(context)
}

/** 首次进入时等待界面就绪再弹出 */
export function getGuidedTourAutoStartDelayMs(context: GuidedTourContext = detectGuidedTourContext()): number {
  if (context === 'route-detail') return 1200
  return 500
}
