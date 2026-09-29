export type RealProfileLeaderboardKind = 'rush' | 'safety' | 'complain'

export interface RealProfileLeaderboardRow {
  rank: number
  name: string
  userId?: number
  value: string
}

export interface RealProfileLeaderboardPanel {
  id: string
  kind: RealProfileLeaderboardKind
  titleKey: 'realProfileLeaderboardDaily' | 'realProfileLeaderboardWeekly'
  updatedLabel: string
  rows: RealProfileLeaderboardRow[]
  playerRank: number | null
  playerValue: string
  rewardHint?: string
}

/** Demo rows mirroring in-game Leaderboard / LeaderboardWeekly layout. */
export const REAL_PROFILE_LEADERBOARD_PANELS: RealProfileLeaderboardPanel[] = [
  {
    id: 'daily-rush',
    kind: 'rush',
    titleKey: 'realProfileLeaderboardDaily',
    updatedLabel: '2026-09-29 12:00',
    rows: [
      { rank: 1, name: 'addisonshiu', userId: 23651717, value: '12:34.52' },
      { rank: 2, name: 'BusDriverKLN', userId: 45031838, value: '12:41.08' },
      { rank: 3, name: 'kmb5', userId: 62628442, value: '12:55.31' },
      { rank: 4, name: 'likehkbusman', userId: 22827563, value: '13:02.17' },
      { rank: 5, name: 'GS9019', userId: 64664624, value: '13:08.44' },
    ],
    playerRank: null,
    playerValue: '—',
    rewardHint: 'realProfileLeaderboardRewardDaily',
  },
  {
    id: 'weekly-safety',
    kind: 'safety',
    titleKey: 'realProfileLeaderboardWeekly',
    updatedLabel: '2026-09-29 12:00',
    rows: [
      { rank: 1, name: 'NLB11A', userId: 75537160, value: '98 (4:12:08)' },
      { rank: 2, name: 'GYVolvo', userId: 66366295, value: '95 (3:58:41)' },
      { rank: 3, name: 'Carcar_Lok', userId: 658480530, value: '92 (3:44:20)' },
      { rank: 4, name: 'feiliver', userId: 198263866, value: '89 (3:31:05)' },
      { rank: 5, name: 'bowieggg', userId: 1467395817, value: '86 (3:18:52)' },
    ],
    playerRank: null,
    playerValue: '—',
    rewardHint: 'realProfileLeaderboardRewardWeekly',
  },
]
