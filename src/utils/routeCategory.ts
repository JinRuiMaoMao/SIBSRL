import type { BusRoute, RouteCategory } from '../types/route'

/** 游戏内未翻译、界面固定英文的类别（卡片类型 / 筛选 / 详情） */
const ENGLISH_ONLY_CATEGORIES: Partial<Record<RouteCategory, string>> = {
  centralAxis: 'Central Axis',
}

export function getEnglishOnlyCategoryLabel(category: RouteCategory): string | null {
  return ENGLISH_ONLY_CATEGORIES[category] ?? null
}

/** 顶部彩色类型徽章（特快、通宵等）；中轴线改在卡片类型区展示 */
export function showCategoryBadge(route: BusRoute): boolean {
  return (
    route.category !== 'inner' &&
    route.category !== 'inter' &&
    route.category !== 'centralAxis'
  )
}

/** 卡片类型：显示在 Z 区标签旁（如 Central Axis） */
export function getCardTypeLabel(route: BusRoute): string | null {
  return ENGLISH_ONLY_CATEGORIES[route.category] ?? null
}

export function showCardTypeMark(route: BusRoute): boolean {
  return getCardTypeLabel(route) != null
}

export function isCircularRoute(route: BusRoute): boolean {
  return route.pattern === 'circular'
}

/** 已有彩色「循环 / Loop」服务类型标签（route.serviceTypes 含 loop） */
export function hasLoopServiceTypeTag(route: BusRoute): boolean {
  return route.serviceTypes?.includes('loop') ?? false
}

/** 循环线：详情标题旁环线（zone-tag）；与彩色 loop 重复时不显示 */
export function showCircularLineBesideNumber(route: BusRoute): boolean {
  return isCircularRoute(route) && !hasLoopServiceTypeTag(route)
}

/** 循环线：卡片 Z 区旁循环（zone-tag）；与彩色 loop 重复时不显示 */
export function showCardLoopMark(route: BusRoute): boolean {
  return isCircularRoute(route) && !hasLoopServiceTypeTag(route)
}
