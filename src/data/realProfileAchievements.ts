import type { BilingualText } from '../types/route'

export type RealProfileAchievementState = 'locked' | 'progress' | 'claimable' | 'completed'

export interface RealProfileAchievementAward {
  gems?: number
  exp?: number
}

export interface RealProfileAchievementEntry {
  id: string
  title: BilingualText
  description: BilingualText
  target?: number
  progress?: number
  state: RealProfileAchievementState
  awards?: RealProfileAchievementAward
  page: number
}

/** Representative subset from OpenData.Achievements in the game place file. */
export const REAL_PROFILE_ACHIEVEMENTS: RealProfileAchievementEntry[] = [
  {
    id: 'ReadFaq',
    page: 1,
    title: { zh: '熟读 FAQ', en: 'Read the FAQ' },
    description: { zh: '打开并阅读常见问题。', en: 'Open and read the FAQ page.' },
    state: 'completed',
    awards: { gems: 5 },
  },
  {
    id: 'Junior',
    page: 1,
    title: { zh: '初级司机', en: 'Junior Driver' },
    description: { zh: '完成 25 次班次。', en: 'Complete 25 bus shifts.' },
    target: 25,
    progress: 0,
    state: 'progress',
    awards: { exp: 500 },
  },
  {
    id: 'Senior',
    page: 1,
    title: { zh: '资深司机', en: 'Senior Driver' },
    description: { zh: '完成 70 次班次。', en: 'Complete 70 bus shifts.' },
    target: 70,
    progress: 0,
    state: 'locked',
    awards: { exp: 1200 },
  },
  {
    id: 'Axis',
    page: 1,
    title: { zh: '中央轴心', en: 'Central Axis' },
    description: { zh: '完成中央轴心路线集合中的路线。', en: 'Finish routes in the Central Axis set.' },
    target: 6,
    progress: 0,
    state: 'locked',
    awards: { gems: 20 },
  },
  {
    id: 'Celestial',
    page: 2,
    title: { zh: '天叶线路', en: 'Celestial Leaf' },
    description: { zh: '完成天叶线路集合中的路线。', en: 'Finish routes in the Celestial Leaf set.' },
    target: 4,
    progress: 0,
    state: 'locked',
    awards: { gems: 20 },
  },
  {
    id: 'Heat',
    page: 2,
    title: { zh: '高峰挑战', en: 'Peak Hour' },
    description: { zh: '在高峰时段完成一条路线。', en: 'Complete a route during peak hours.' },
    state: 'locked',
    awards: { exp: 300 },
  },
  {
    id: 'Donator',
    page: 2,
    title: { zh: '支持者', en: 'Supporter' },
    description: { zh: '向游戏捐赠 Robux。', en: 'Donate Robux to support the game.' },
    state: 'locked',
    awards: { gems: 10 },
  },
  {
    id: 'ProDriver',
    page: 2,
    title: { zh: 'Pro 模式', en: 'Pro Driver' },
    description: { zh: '在 Pro 模式下完成一条路线。', en: 'Complete a route in Pro mode.' },
    state: 'locked',
    awards: { exp: 800 },
  },
]

export const REAL_PROFILE_ACHIEVEMENT_PAGE_COUNT = 2
