/** Keys we must keep when other features update the URL via history API. */
export interface AppHistoryState {
  sibsRealTab?: string
  [key: string]: unknown
}

export function readAppHistoryState(): AppHistoryState | null {
  const state = window.history.state
  if (!state || typeof state !== 'object') return null
  return state as AppHistoryState
}

/** Keep Real shell tab (and any other history keys) when mutating the URL. */
export function preserveAppHistoryState(): AppHistoryState | null {
  const state = readAppHistoryState()
  if (!state) return null
  const keys = Object.keys(state)
  if (keys.length === 0) return null
  return { ...state }
}
