import { getLatestUpdatePromptKey } from '../data/versionUpdates'
import { getLastSeenUpdatePromptKey } from '../storage/updatesViewing'
import { isRoutesPage } from './appTabNavigation'
import { readRouteQueryFromLocation } from './routeNavigation'

/**
 * 是否应展示更新日志弹窗：
 * - 最新条目 id + 内容指纹与本地已读不一致（含同日追加内容）
 * 恢复默认设置会清空已读记录，因此会再弹一次。
 */
export function shouldShowUpdatesPrompt(): boolean {
  if (!isRoutesPage()) return false
  if (readRouteQueryFromLocation()) return false

  return hasUnreadUpdates()
}

/** 是否有尚未查看的最新更新（用于底栏「!」角标）。 */
export function hasUnreadUpdates(): boolean {
  const latestPromptKey = getLatestUpdatePromptKey()
  if (!latestPromptKey) return false

  return getLastSeenUpdatePromptKey() !== latestPromptKey
}
