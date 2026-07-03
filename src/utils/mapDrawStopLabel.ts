export const DEFAULT_STOP_LABEL_SCALE = 1
export const MIN_STOP_LABEL_SCALE = 0.6
export const MAX_STOP_LABEL_SCALE = 2.5

const VISIBLE_STORAGE_KEY = 'sibs-map-draw-stop-label-visible'
const SCALE_STORAGE_KEY = 'sibs-map-draw-stop-label-scale'

export function normalizeStopLabelScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STOP_LABEL_SCALE
  return Math.min(MAX_STOP_LABEL_SCALE, Math.max(MIN_STOP_LABEL_SCALE, value))
}

export function readStoredMapDrawStopLabelVisible(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(VISIBLE_STORAGE_KEY)
    if (stored === '0' || stored === 'false') return false
    if (stored === '1' || stored === 'true') return true
  } catch {
    // ignore
  }
  return true
}

export function writeStoredMapDrawStopLabelVisible(visible: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(VISIBLE_STORAGE_KEY, visible ? '1' : '0')
  } catch {
    // ignore
  }
}

export function readStoredMapDrawStopLabelScale(): number {
  if (typeof window === 'undefined') return DEFAULT_STOP_LABEL_SCALE
  try {
    const stored = window.localStorage.getItem(SCALE_STORAGE_KEY)
    if (stored == null) return DEFAULT_STOP_LABEL_SCALE
    return normalizeStopLabelScale(Number(stored))
  } catch {
    return DEFAULT_STOP_LABEL_SCALE
  }
}

export function writeStoredMapDrawStopLabelScale(scale: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SCALE_STORAGE_KEY, String(normalizeStopLabelScale(scale)))
  } catch {
    // ignore
  }
}
