import type { RouteBroadcast } from '../types/routeBroadcast'

/** 线路报站文稿；在线路详情卡展示，后续按 routeId 补充 */
export const routeBroadcasts: RouteBroadcast[] = []

export function getRouteBroadcast(routeId: string): RouteBroadcast | undefined {
  return routeBroadcasts.find((b) => b.routeId === routeId)
}
