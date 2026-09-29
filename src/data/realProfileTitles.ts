import type { BilingualText } from '../types/route'

export interface RealProfileGameTitle {
  id: string
  label: BilingualText
  vip?: boolean
  unlocked: boolean
}

/** Title slots from the in-game profile Title tab grid. */
export const REAL_PROFILE_GAME_TITLES: RealProfileGameTitle[] = [
  { id: 'driver', label: { zh: '司机', en: 'Driver' }, unlocked: true },
  { id: 'rookie', label: { zh: '新手', en: 'Rookie' }, unlocked: true },
  { id: 'bus-captain', label: { zh: '巴士队长', en: 'Bus Captain' }, unlocked: false },
  { id: 'route-master', label: { zh: '路线大师', en: 'Route Master' }, unlocked: false },
  { id: 'night-owl', label: { zh: '夜猫子', en: 'Night Owl' }, unlocked: false },
  { id: 'peak-hour', label: { zh: '高峰达人', en: 'Peak Hour Pro' }, unlocked: false },
  { id: 'safe-driver', label: { zh: '安全驾驶', en: 'Safe Driver' }, unlocked: false },
  { id: 'collector', label: { zh: '收藏家', en: 'Collector' }, unlocked: false },
  { id: 'vip', label: { zh: 'VIP 会员', en: 'VIP Member' }, vip: true, unlocked: false },
  { id: 'developer', label: { zh: '开发者', en: 'Developer' }, vip: true, unlocked: false },
  { id: 'donator', label: { zh: '捐赠者', en: 'Donator' }, unlocked: false },
  { id: 'legend', label: { zh: '传奇司机', en: 'Legend' }, unlocked: false },
]
