export type RealShopTabId = 'pass' | 'boost' | 'shards' | 'donate'

export const REAL_SHOP_TAB_ORDER: RealShopTabId[] = ['pass', 'boost', 'shards', 'donate']

export interface RealShopBoostItem {
  id: string
  price: number
  theme: 'purple' | 'gold'
}

export interface RealShopShardItem {
  id: string
  amount: number
  price: number
  badge?: 'popular' | 'best'
  wide?: boolean
}

export interface RealShopDonationTier {
  amount: number
}

export interface RealShopDonationLeader {
  name: string
  amount: number
}

export const REAL_SHOP_BOOSTS: RealShopBoostItem[] = [
  { id: 'exp-15', price: 149, theme: 'purple' },
  { id: 'exp-30', price: 249, theme: 'purple' },
  { id: 'shards-20', price: 279, theme: 'gold' },
]

export const REAL_SHOP_SHARDS: RealShopShardItem[] = [
  { id: 's50', amount: 50, price: 49 },
  { id: 's172', amount: 172, price: 149 },
  { id: 's840', amount: 840, price: 499 },
  { id: 's2500', amount: 2500, price: 999, badge: 'popular', wide: true },
  { id: 's6500', amount: 6500, price: 2499, badge: 'best', wide: true },
]

export const REAL_SHOP_DONATION_TIERS: RealShopDonationTier[] = [
  { amount: 100 },
  { amount: 500 },
  { amount: 1000 },
  { amount: 5000 },
  { amount: 10000 },
  { amount: 50000 },
]

export const REAL_SHOP_DONATION_LEADERS: RealShopDonationLeader[] = [
  { name: 'OneSpottedFriend', amount: 50000 },
  { name: 'supernovasalmon', amount: 25000 },
  { name: 'BusDriver_HK', amount: 12000 },
  { name: 'IslandRider42', amount: 8500 },
  { name: 'SIBSFan2024', amount: 5000 },
]

export const REAL_SHOP_USER_DONATED = 100

export const REAL_SHOP_PASS_IDS = ['vip', 'developer', 'ultimate', 'master'] as const
export type RealShopPassId = (typeof REAL_SHOP_PASS_IDS)[number]
