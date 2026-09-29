import type { RealShopPassId } from './realShopCatalog'

/** rbxassetid values from the in-game Shop UI. */
export const REAL_SHOP_PASS_ART: Record<RealShopPassId, number> = {
  vip: 5903903949,
  developer: 16337655177,
  ultimate: 16337461722,
  master: 15681733281,
}

export const REAL_SHOP_UI_ASSETS = {
  close: 6031094678,
  gift: 6023426978,
  perkStar: 6031068428,
  perkExp: 6031302996,
  perkCheck: 6031265978,
} as const
