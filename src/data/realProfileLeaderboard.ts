export interface RealProfileLeaderboardRow {
  rank: number
  name: string
  userId?: number
  score: number
}

export interface RealProfileLeaderboardPanel {
  id: string
  titleKey: 'realProfileLeaderboardDaily' | 'realProfileLeaderboardWeekly'
  rows: RealProfileLeaderboardRow[]
  playerLabel: string
  playerScoreLabel: string
  endingLabel?: string
}

/** Demo rows matching in-game On-time departure leaderboards. */
export const REAL_PROFILE_LEADERBOARD_PANELS: RealProfileLeaderboardPanel[] = [
  {
    id: 'on-time',
    titleKey: 'realProfileLeaderboardDaily',
    rows: [
      { rank: 1, name: 'LMHJ61', userId: 75537160, score: 63895 },
      { rank: 2, name: 'ivandule89', userId: 45031838, score: 63501 },
      { rank: 3, name: 'addisonshiu', userId: 23651717, score: 63102 },
      { rank: 4, name: 'kmb5', userId: 62628442, score: 62844 },
      { rank: 5, name: 'BusDriverKLN', userId: 45031838, score: 62109 },
    ],
    playerLabel: '[NA] You (JinRui_MaoMao)',
    playerScoreLabel: '[Unknown]',
  },
  {
    id: 'on-time-weekly',
    titleKey: 'realProfileLeaderboardWeekly',
    rows: [
      { rank: 1, name: 'basket_curry67', userId: 64664624, score: 1114 },
      { rank: 2, name: 'NLB11A', userId: 75537160, score: 1098 },
      { rank: 3, name: 'GYVolvo', userId: 66366295, score: 1055 },
      { rank: 4, name: 'likehkbusman', userId: 22827563, score: 1022 },
      { rank: 5, name: 'GS9019', userId: 64664624, score: 998 },
    ],
    playerLabel: '[NA] You (JinRui_MaoMao)',
    playerScoreLabel: '[Unknown]',
    endingLabel: '01d 22h',
  },
]
