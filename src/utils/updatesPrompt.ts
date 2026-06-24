import { getLatestUpdateId } from '../data/versionUpdates'
import { getLastSeenUpdateId } from '../storage/updatesViewing'
import { isRoutesPage } from './appTabNavigation'
import { readRouteQueryFromLocation } from './routeNavigation'

/**
 * 是否应展示更新日志弹窗：
 * - 最新条目 id 与本地已读 id 不一致（有新版本日志）
 * 恢复默认设置会清空已读记录，因此会再弹一次。
 */
export function shouldShowUpdatesPrompt(): boolean {
  if (!isRoutesPage()) return false
  if (readRouteQueryFromLocation()) return false

  return hasUnreadUpdates()
}

/** 是否有尚未查看的最新更新（用于底栏「!」角标）。 */
export function hasUnreadUpdates(): boolean {
  const latestUpdateId = getLatestUpdateId()
  if (!latestUpdateId) return false

  return getLastSeenUpdateId() !== latestUpdateId
}
