import type { BilingualText } from '../types/route'

export interface RealProfileGameIcon {
  id: string
  label: BilingualText
  /** Roblox userId for demo headshot, or null for default slot art. */
  previewUserId?: number
  unlocked: boolean
  vip?: boolean
}

/** Icon inventory slots from the in-game profile Icon tab. */
export const REAL_PROFILE_GAME_ICONS: RealProfileGameIcon[] = [
  { id: 'default', label: { zh: '默认', en: 'Default' }, unlocked: true },
  { id: 'sun', label: { zh: '阳光', en: 'Sunshine' }, previewUserId: 23651717, unlocked: true },
  { id: 'bus', label: { zh: '巴士', en: 'Bus' }, previewUserId: 45031838, unlocked: true },
  { id: 'star', label: { zh: '星级', en: 'Star' }, previewUserId: 62628442, unlocked: false },
  { id: 'vip', label: { zh: 'VIP', en: 'VIP' }, vip: true, unlocked: false },
  { id: 'donator', label: { zh: '捐赠者', en: 'Donator' }, unlocked: false },
  { id: 'operator', label: { zh: '运营商', en: 'Operator' }, previewUserId: 64664624, unlocked: false },
  { id: 'translator', label: { zh: '翻译', en: 'Translator' }, previewUserId: 1467395817, unlocked: false },
  { id: 'modeler', label: { zh: '建模', en: 'Modeler' }, previewUserId: 75537160, unlocked: false },
  { id: 'veteran', label: { zh: '资深', en: 'Veteran' }, unlocked: false },
  { id: 'pro', label: { zh: 'Pro', en: 'Pro' }, unlocked: false },
  { id: 'custom', label: { zh: '自定义', en: 'Custom' }, vip: true, unlocked: false },
]
