import { isRoutesPage } from './appTabNavigation'
import { readRouteQueryFromLocation } from './routeNavigation'
import {
  hasSeenUpdatesPrompt,
  hasViewedUpdatesLog,
} from '../storage/updatesViewing'

/** 线路首页、无线路详情、未看过更新页且未弹过提示时展示更新日志弹窗 */
export function shouldShowUpdatesPrompt(): boolean {
  if (!isRoutesPage()) return false
  if (readRouteQueryFromLocation()) return false
  if (hasViewedUpdatesLog()) return false
  if (hasSeenUpdatesPrompt()) return false
  return true
}
