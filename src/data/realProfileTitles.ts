import type { BilingualText } from '../types/route'

export type RealProfileTitleColor =
  | 'white'
  | 'green'
  | 'red'
  | 'cyan'
  | 'yellow'
  | 'purple'
  | 'beige'
  | 'orange'

export interface RealProfileGameTitle {
  id: string
  label: BilingualText
  color: RealProfileTitleColor
  unlocked: boolean
}

/** Title grid from the in-game profile Title tab (5×3 visible page). */
export const REAL_PROFILE_GAME_TITLES: RealProfileGameTitle[] = [
  { id: 'rookie', label: { zh: 'Rookie', en: 'Rookie' }, color: 'white', unlocked: true },
  { id: 'junior', label: { zh: '初級', en: 'Junior' }, color: 'green', unlocked: true },
  { id: 'oven', label: { zh: '烤箱', en: 'Oven' }, color: 'red', unlocked: false },
  { id: 'freezer', label: { zh: '冷凍櫃', en: 'Freezer' }, color: 'cyan', unlocked: false },
  { id: 'realist', label: { zh: '現實主義者', en: 'Realist' }, color: 'white', unlocked: false },
  { id: 'navigator', label: { zh: '導航員', en: 'Navigator' }, color: 'green', unlocked: false },
  { id: 'lightspeed', label: { zh: '光速', en: 'Lightspeed' }, color: 'yellow', unlocked: false },
  { id: 'master', label: { zh: '大師', en: 'Master' }, color: 'yellow', unlocked: false },
  { id: 'senior', label: { zh: '資深', en: 'Senior' }, color: 'green', unlocked: false },
  { id: 'concentrator', label: { zh: '集中器', en: 'Concentrator' }, color: 'green', unlocked: false },
  { id: 'curious', label: { zh: '好奇的', en: 'Curious' }, color: 'yellow', unlocked: false },
  { id: 'hardcore', label: { zh: '硬核', en: 'Hardcore' }, color: 'purple', unlocked: false },
  { id: 'racer', label: { zh: '競速選手', en: 'Racer' }, color: 'orange', unlocked: false },
  { id: 'vip', label: { zh: '貴賓', en: 'VIP' }, color: 'beige', unlocked: false },
  { id: 'donator', label: { zh: '捐贈者', en: 'Donator' }, color: 'yellow', unlocked: false },
]
