import { getLatestUpdateId } from '../data/versionUpdates'
import { getLastSeenUpdateId } from '../storage/updatesViewing'
import { isRoutesPage } from './appTabNavigation'
import { readRouteQueryFromLocation } from './routeNavigation'

/** 线路首页、无线路详情，且最新更新条目尚未标记已读时展示弹窗 */
export function shouldShowUpdatesPrompt(): boolean {
  if (!isRoutesPage()) return false
  if (readRouteQueryFromLocation()) return false

  const latestId = getLatestUpdateId()
  if (!latestId) return false

  return getLastSeenUpdateId() !== latestId
}
