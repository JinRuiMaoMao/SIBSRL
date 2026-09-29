import type { BilingualText } from '../types/route'

export interface RealProfileGameTitle {
  id: string
  label: BilingualText
  vip?: boolean
}

/** Free / unlockable name titles shown in the in-game profile Title tab. */
export const REAL_PROFILE_GAME_TITLES: RealProfileGameTitle[] = [
  { id: 'driver', label: { zh: '司机', en: 'Driver' } },
  { id: 'bus-captain', label: { zh: '巴士队长', en: 'Bus Captain' } },
  { id: 'route-master', label: { zh: '路线大师', en: 'Route Master' } },
  { id: 'vip', label: { zh: 'VIP 会员', en: 'VIP Member' }, vip: true },
  { id: 'developer', label: { zh: '开发者', en: 'Developer' }, vip: true },
]
