import type { BilingualText } from '../types/route'

export interface RealProfileGameIcon {
  id: string
  label: BilingualText
  emoji: string
  unlocked: boolean
}

/** Icon inventory samples from the in-game profile Icon tab. */
export const REAL_PROFILE_GAME_ICONS: RealProfileGameIcon[] = [
  { id: 'default', label: { zh: '默认', en: 'Default' }, emoji: '🙂', unlocked: true },
  { id: 'sun', label: { zh: '阳光', en: 'Sunshine' }, emoji: '☀', unlocked: true },
  { id: 'bus', label: { zh: '巴士', en: 'Bus' }, emoji: '🚌', unlocked: true },
  { id: 'star', label: { zh: '星级', en: 'Star' }, emoji: '⭐', unlocked: false },
  { id: 'vip', label: { zh: 'VIP', en: 'VIP' }, emoji: '👑', unlocked: false },
  { id: 'donator', label: { zh: '捐赠者', en: 'Donator' }, emoji: '💎', unlocked: false },
]
