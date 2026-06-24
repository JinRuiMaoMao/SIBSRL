import type { BilingualText } from '../types/route'

export interface TriviaFact {
  id: string
  text: BilingualText
}

export const triviaFacts: TriviaFact[] = [
  {
    id: 'visits-1m',
    text: {
      zh: '此游戏在 2020 年 4 月 1 日达成 100 万进入人次。',
      en: 'The game reached 1 million visits on April 1, 2020.',
    },
  },
  {
    id: 'peak-concurrent',
    text: {
      zh: '最高同时在线玩家纪录于 2024 年 12 月 14 日（星期六）香港时间晚上 11:00 创下，当时有 3620 位玩家同时在线。',
      en: 'Peak concurrent players was 3,620 on Saturday, December 14, 2024 at 11:00 PM HKT.',
    },
  },
  {
    id: 'likes-10k',
    text: {
      zh: '此游戏在 2024 年 6 月 3 日凌晨达成 1 万点赞。',
      en: 'The game reached 10,000 likes in the early hours of June 3, 2024.',
    },
  },
  {
    id: 'largest-map',
    text: {
      zh: '此游戏是香港各虚拟地图中空间最大的一款，加载时间往往比其他游戏更长。',
      en: 'SIBS has the largest map among Hong Kong virtual maps; loading often takes longer than other games.',
    },
  },
]
