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

function link(
  from: WalkLinkEndpoint,
  to: WalkLinkEndpoint,
  minutes: number,
): WalkLink[] {
  return [
    { from, to, minutes },
    { from: to, to: from, minutes },
  ]
}

export const WALK_LINKS: WalkLink[] = [
  ...link(
    { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
    { zh: '彩虹广场', en: 'Rainbow Plaza' },
    6,
  ),
  ...link(
    { zh: '彩虹邨', en: 'Rainbow Estate' },
    { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
    5,
  ),
  ...link(
    { zh: '彩虹广场', en: 'Rainbow Plaza' },
    { zh: '彩虹邨', en: 'Rainbow Estate' },
    4,
  ),
  ...link(
    { zh: '仙贝', en: 'Senpai' },
    { zh: '仙贝广场', en: 'Senpai Shopping Center' },
    5,
  ),
  ...link(
    { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    { zh: '文化广场', en: 'Culture Square' },
    4,
  ),
  ...link(
    { zh: '叶角湾坟场', en: 'Leafy Bay Cemetery' },
    { zh: '叶角湾', en: 'Leafy Bay' },
    4,
  ),
  ...link(
    { zh: '叶角湾', en: 'Leafy Bay' },
    { zh: '叶角湾邨', en: 'Leafy Bay Estate' },
    5,
  ),
  ...link(
    { zh: '叶角医院', en: 'Leafy Hospital' },
    { zh: '叶角湾邨', en: 'Leafy Bay Estate' },
    4,
  ),
  ...link(
    { zh: '东门总站', en: 'East Door Bus Terminus' },
    { zh: '东门', en: 'East Door' },
    3,
  ),
  ...link(
    { zh: '北顿市中心', en: 'Norton Town Center' },
    { zh: '北顿市中心总站', en: 'Norton Town Centre Bus Terminus' },
    3,
  ),
  ...link(
    { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    { zh: '长岛码头总站', en: 'Long Island Ferry Pier Bus Terminus' },
    2,
  ),
]

export function findWalkLinksToDestination(destKey: string): WalkLink[] {
  return WALK_LINKS.filter((link) => endpointKey(link.to) === destKey)
}

function endpointKey(endpoint: WalkLinkEndpoint): string {
  return canonicalStopKey(endpoint.zh, endpoint.en)
}
