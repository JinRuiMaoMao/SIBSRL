export const DEFAULT_MAP_DRAW_COLOR = '#5ec8ff'

export const MAP_DRAW_COLOR_PRESETS = [
  '#5ec8ff',
  '#f5b942',
  '#ff5c5c',
  '#53e695',
  '#c77dff',
  '#ffffff',
  '#111111',
] as const

const STORAGE_KEY = 'sibs-map-draw-color'

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function byteToHex(value: number): string {
  return clampByte(value).toString(16).padStart(2, '0')
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`
}

function expandShortHex(hex: string): string | null {
  if (!/^#[0-9a-f]{3}$/i.test(hex)) return null
  const r = hex[1]!
  const g = hex[2]!
  const b = hex[3]!
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
}

export function normalizeMapDrawColor(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return expandShortHex(trimmed)
  }
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase()
  }

  const rgbMatch = /^rgba?\(\s*([^)]+)\)$/i.exec(trimmed)
  if (rgbMatch) {
    const parts = rgbMatch[1]!
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length < 3) return null
    const r = Number(parts[0])
    const g = Number(parts[1])
    const b = Number(parts[2])
    if (![r, g, b].every(Number.isFinite)) return null
    return rgbToHex(r, g, b)
  }

  const bareHex = trimmed.replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(bareHex)) {
    return `#${bareHex.toLowerCase()}`
  }
  if (/^[0-9a-f]{3}$/i.test(bareHex)) {
    return expandShortHex(`#${bareHex}`)
  }

  return null
}

export function readStoredMapDrawColor(): string {
  if (typeof window === 'undefined') return DEFAULT_MAP_DRAW_COLOR
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return normalizeMapDrawColor(stored ?? '') ?? DEFAULT_MAP_DRAW_COLOR
  } catch {
    return DEFAULT_MAP_DRAW_COLOR
  }
}

export function writeStoredMapDrawColor(color: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, color)
  } catch {
    // ignore quota / private mode
  }
}

export function formatMapDrawColorLabel(color: string): string {
  const normalized = normalizeMapDrawColor(color) ?? DEFAULT_MAP_DRAW_COLOR
  const hex = normalized.slice(1)
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `${normalized.toUpperCase()} · rgb(${r}, ${g}, ${b})`
}
