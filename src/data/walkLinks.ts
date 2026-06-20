import { canonicalStopKey } from '../utils/stopIdentity'

export interface WalkLinkEndpoint {
  zh: string
  en: string
}

/** 游戏内可步行往来的站点对（估算时间，非官方数据） */
export interface WalkLink {
  from: WalkLinkEndpoint
  to: WalkLinkEndpoint
  minutes: number
}

export const WALK_LINKS: WalkLink[] = [
  {
    from: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
    to: { zh: '彩虹广场', en: 'Rainbow Plaza' },
    minutes: 6,
  },
  {
    from: { zh: '彩虹广场', en: 'Rainbow Plaza' },
    to: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
    minutes: 6,
  },
  {
    from: { zh: '彩虹邨', en: 'Rainbow Estate' },
    to: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
    minutes: 5,
  },
  {
    from: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
    to: { zh: '彩虹邨', en: 'Rainbow Estate' },
    minutes: 5,
  },
  {
    from: { zh: '彩虹广场', en: 'Rainbow Plaza' },
    to: { zh: '彩虹邨', en: 'Rainbow Estate' },
    minutes: 4,
  },
  {
    from: { zh: '彩虹邨', en: 'Rainbow Estate' },
    to: { zh: '彩虹广场', en: 'Rainbow Plaza' },
    minutes: 4,
  },
  {
    from: { zh: '仙贝', en: 'Senpai' },
    to: { zh: '仙贝广场', en: 'Senpai Shopping Center' },
    minutes: 5,
  },
  {
    from: { zh: '仙贝广场', en: 'Senpai Shopping Center' },
    to: { zh: '仙贝', en: 'Senpai' },
    minutes: 5,
  },
  {
    from: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    to: { zh: '文化广场', en: 'Culture Square' },
    minutes: 4,
  },
  {
    from: { zh: '文化广场', en: 'Culture Square' },
    to: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    minutes: 4,
  },
]

export function findWalkLinksToDestination(destKey: string): WalkLink[] {
  return WALK_LINKS.filter((link) => endpointKey(link.to) === destKey)
}

function endpointKey(endpoint: WalkLinkEndpoint): string {
  return canonicalStopKey(endpoint.zh, endpoint.en)
}
