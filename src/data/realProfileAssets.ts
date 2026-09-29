import type { RealProfileHudTab } from '../utils/realHudEvents'

/** rbxassetid values from Profile UI in the game place file. */
export const REAL_PROFILE_UI_ASSET_IDS = {
  chalkboard: 9140355801,
  tabStats: 6034925606,
  tabTitle: 6035173865,
  tabIcon: 6035202069,
  tabLeaderboard: 6026568216,
  tabAchievements: 12974243184,
  exitChevron: 6031091008,
  statsPaper: 5205209020,
  licenseSun: 5375093642,
  statsZoom: 6031154871,
  newBadge: 534274092,
  titleUnlockIcon: 6026660063,
} as const

export type RealProfileUiImageKey = keyof typeof REAL_PROFILE_UI_ASSET_IDS

export const REAL_PROFILE_TAB_ICON_KEYS: Record<RealProfileHudTab, RealProfileUiImageKey> = {
  stats: 'tabStats',
  title: 'tabTitle',
  icon: 'tabIcon',
  leaderboard: 'tabLeaderboard',
  achievements: 'tabAchievements',
}

export const REAL_PROFILE_TABS_WITH_NEW_BADGE: RealProfileHudTab[] = ['title', 'icon']
