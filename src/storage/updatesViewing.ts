export const UPDATES_LOG_VIEWED_KEY = 'sibs-updates-log-viewed'
export const UPDATES_PROMPT_SHOWN_KEY = 'sibs-updates-prompt-shown'

export function hasViewedUpdatesLog(): boolean {
  try {
    return localStorage.getItem(UPDATES_LOG_VIEWED_KEY) === '1'
  } catch {
    return false
  }
}

export function markUpdatesLogViewed(): void {
  try {
    localStorage.setItem(UPDATES_LOG_VIEWED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function hasSeenUpdatesPrompt(): boolean {
  try {
    return localStorage.getItem(UPDATES_PROMPT_SHOWN_KEY) === '1'
  } catch {
    return false
  }
}

export function markUpdatesPromptShown(): void {
  try {
    localStorage.setItem(UPDATES_PROMPT_SHOWN_KEY, '1')
  } catch {
    /* ignore */
  }
}
