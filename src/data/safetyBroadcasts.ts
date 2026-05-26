import type { SafetyBroadcast } from '../types/safetyBroadcast'

const COMMON_AUDIO = './audio/broadcasts/common'

/** 游戏内编号；7「请勿阻塞通道」不存在 */
const COMMON_BROADCASTS: { n: number; zh: string; en: string }[] = [
  { n: 1, zh: '请紧握扶手', en: 'Please hold the handrail' },
  { n: 2, zh: '请行入车厢', en: 'Please move into the saloon' },
  { n: 3, zh: '请勿超越黄线', en: 'Please do not cross the yellow line' },
  { n: 4, zh: '保持车厢清洁', en: 'Please keep the bus clean' },
  { n: 5, zh: '照顾小孩长者', en: 'Please take care of children and elderly passengers' },
  { n: 6, zh: '请勿饮食', en: 'No eating or drinking on board' },
  { n: 8, zh: '车长受到滋扰 巴士服务中断', en: 'Captain harassed — bus service suspended' },
  { n: 9, zh: '交通改道', en: 'Traffic diversion' },
  { n: 10, zh: '你也可以让座', en: 'You may also offer your seat' },
  { n: 11, zh: '请保持车厢安静', en: 'Please keep quiet on the bus' },
  { n: 12, zh: '上层不准站立 梯间不准站立', en: 'No standing on upper deck or staircase' },
  { n: 13, zh: '为稳定班次 巴士稍作停留', en: 'Brief pause to maintain schedule' },
  { n: 14, zh: '使用八达通 享受双向分段优惠', en: 'Use Octopus for directional section fares' },
  { n: 15, zh: '本站设有分段收费 收费拍卡机', en: 'Section fare at this stop — fare validators' },
  { n: 16, zh: '如要下车 请提早按铃', en: 'Press the bell early if you wish to alight' },
]

function toEntry(row: (typeof COMMON_BROADCASTS)[number]): SafetyBroadcast {
  const suffix = String(row.n).padStart(2, '0')
  return {
    id: `common-${suffix}`,
    set: 'common',
    number: row.n,
    title: { zh: row.zh, en: row.en },
    audioUrl: `${COMMON_AUDIO}/common-${suffix}.mp3`,
  }
}

export const safetyBroadcasts: SafetyBroadcast[] = COMMON_BROADCASTS.map(toEntry)

export const COMMON_BROADCAST_NUMBERS = COMMON_BROADCASTS.map((s) => s.n)
