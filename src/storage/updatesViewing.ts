export const UPDATES_LAST_SEEN_ID_KEY = 'sibs-updates-last-seen-id'

/** @deprecated 旧版布尔标记，仅用于迁移 */
const LEGACY_UPDATES_LOG_VIEWED_KEY = 'sibs-updates-log-viewed'
const LEGACY_UPDATES_PROMPT_SHOWN_KEY = 'sibs-updates-prompt-shown'

export function getLastSeenUpdateId(): string | null {
  try {
    return localStorage.getItem(UPDATES_LAST_SEEN_ID_KEY)
  } catch {
    return null
  }
}

export function markUpdateSeen(updateId: string): void {
  try {
    localStorage.setItem(UPDATES_LAST_SEEN_ID_KEY, updateId)
    localStorage.removeItem(LEGACY_UPDATES_LOG_VIEWED_KEY)
    localStorage.removeItem(LEGACY_UPDATES_PROMPT_SHOWN_KEY)
  } catch {
    /* ignore */
  }
}

/** 打开完整更新页时标记已读 */
export function markUpdatesLogViewed(updateId: string): void {
  markUpdateSeen(updateId)
}
