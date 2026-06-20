export const UPDATES_LAST_SEEN_ID_KEY = 'sibs-updates-last-seen-id'

/** @deprecated 旧版布尔标记，仅用于迁移 */
const LEGACY_UPDATES_LOG_VIEWED_KEY = 'sibs-updates-log-viewed'
const LEGACY_UPDATES_PROMPT_SHOWN_KEY = 'sibs-updates-prompt-shown'

export function getLastSeenUpdatePromptKey(): string | null {
  try {
    return localStorage.getItem(UPDATES_LAST_SEEN_ID_KEY)
  } catch {
    return null
  }
}

/** @deprecated 使用 getLastSeenUpdatePromptKey */
export function getLastSeenUpdateId(): string | null {
  return getLastSeenUpdatePromptKey()
}

export function markUpdateSeen(promptKey: string): void {
  try {
    localStorage.setItem(UPDATES_LAST_SEEN_ID_KEY, promptKey)
    localStorage.removeItem(LEGACY_UPDATES_LOG_VIEWED_KEY)
    localStorage.removeItem(LEGACY_UPDATES_PROMPT_SHOWN_KEY)
  } catch {
    /* ignore */
  }
}

export function clearUpdatesPromptSeen(): void {
  try {
    localStorage.removeItem(UPDATES_LAST_SEEN_ID_KEY)
    localStorage.removeItem(LEGACY_UPDATES_LOG_VIEWED_KEY)
    localStorage.removeItem(LEGACY_UPDATES_PROMPT_SHOWN_KEY)
  } catch {
    /* ignore */
  }
}

/** 打开完整更新页时标记已读 */
export function markUpdatesLogViewed(promptKey: string): void {
  markUpdateSeen(promptKey)
}
