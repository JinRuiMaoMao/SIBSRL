export type RealProfileHudTab = 'stats' | 'title' | 'icon' | 'leaderboard' | 'achievements'

export type RealHudAction =
  | { type: 'open-shop' }
  | { type: 'open-profile'; tab?: RealProfileHudTab }
  | { type: 'open-daily-tasks' }

export const REAL_HUD_EVENT = 'sibs-real-hud-action'

export function dispatchRealHudAction(action: RealHudAction): void {
  window.dispatchEvent(new CustomEvent<RealHudAction>(REAL_HUD_EVENT, { detail: action }))
}

export function readRealHudAction(event: Event): RealHudAction | null {
  if (!(event instanceof CustomEvent)) return null
  const detail = event.detail as RealHudAction | undefined
  if (!detail || typeof detail.type !== 'string') return null
  return detail
}
