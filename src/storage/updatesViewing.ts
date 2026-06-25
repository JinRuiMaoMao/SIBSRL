export const UPDATES_LAST_SEEN_ID_KEY = 'sibs-updates-last-seen-id'
export const UPDATES_VIEWING_CHANGED_EVENT = 'sibs-updates-viewing-changed'

/** @deprecated 旧版布尔标记，仅用于迁移 */
const LEGACY_UPDATES_LOG_VIEWED_KEY = 'sibs-updates-log-viewed'
const LEGACY_UPDATES_PROMPT_SHOWN_KEY = 'sibs-updates-prompt-shown'

function normalizeUpdateSeenId(stored: string): string {
  const hashIdx = stored.indexOf('#')
  return hashIdx >= 0 ? stored.slice(0, hashIdx) : stored
}

/** @deprecated 使用 getLastSeenUpdateId */
export function getLastSeenUpdatePromptKey(): string | null {
  try {
    return localStorage.getItem(UPDATES_LAST_SEEN_ID_KEY)
  } catch {
    return null
  }
}

/** 已读的最新更新条目 id（兼容旧版 id#内容指纹 存储格式）。 */
export function getLastSeenUpdateId(): string | null {
  const stored = getLastSeenUpdatePromptKey()
  if (!stored) return null
  return normalizeUpdateSeenId(stored)
}

function notifyUpdatesViewingChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(UPDATES_VIEWING_CHANGED_EVENT))
}

/** 已读标记：完整 prompt key（id#内容指纹）。 */
export function markUpdateSeen(promptKey: string): void {
  try {
    localStorage.setItem(UPDATES_LAST_SEEN_ID_KEY, promptKey)
    localStorage.removeItem(LEGACY_UPDATES_LOG_VIEWED_KEY)
    localStorage.removeItem(LEGACY_UPDATES_PROMPT_SHOWN_KEY)
    notifyUpdatesViewingChanged()
  } catch {
    /* ignore */
  }
}

export function clearUpdatesPromptSeen(): void {
  try {
    localStorage.removeItem(UPDATES_LAST_SEEN_ID_KEY)
    localStorage.removeItem(LEGACY_UPDATES_LOG_VIEWED_KEY)
    localStorage.removeItem(LEGACY_UPDATES_PROMPT_SHOWN_KEY)
    notifyUpdatesViewingChanged()
  } catch {
    /* ignore */
  }
}

/** 打开完整更新页时标记已读 */
export function markUpdatesLogViewed(promptKey: string): void {
  markUpdateSeen(promptKey)
}
