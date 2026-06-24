import { getLatestUpdatePromptKey } from '../data/versionUpdates'
import { getLastSeenUpdatePromptKey } from '../storage/updatesViewing'
import { isRoutesPage } from './appTabNavigation'
import { readRouteQueryFromLocation } from './routeNavigation'

/**
 * 是否应展示更新日志弹窗：
 * - 首次访问（无已读记录）
 * - 或最新条目内容指纹与已读不一致（changelog 有新增/修改）
 * 恢复默认设置会清空已读记录，因此会再弹一次。
 */
export function shouldShowUpdatesPrompt(): boolean {
  if (!isRoutesPage()) return false
  if (readRouteQueryFromLocation()) return false

  return hasUnreadUpdates()
}

/** 是否有尚未查看的最新更新（用于顶栏「!」角标）。 */
export function hasUnreadUpdates(): boolean {
  const latestPromptKey = getLatestUpdatePromptKey()
  if (!latestPromptKey) return false

  return getLastSeenUpdatePromptKey() !== latestPromptKey
}
