import {
  REAL_PROFILE_IMAGE_FILES,
  REAL_SHOP_IMAGE_FILES,
  ROBLOX_HEADSHOT_FILES,
} from '../data/robloxImages.generated'
import { getSiteAssetRoot } from './appLayoutMode'

function localAssetUrl(rel: string): string {
  return `${getSiteAssetRoot()}${rel}`
}

export function robloxHeadshotAssetUrl(userId: number): string | null {
  const rel = ROBLOX_HEADSHOT_FILES[userId]
  if (!rel) return null
  return localAssetUrl(rel)
}

export function realShopImageUrl(key: keyof typeof REAL_SHOP_IMAGE_FILES): string | null {
  const rel = REAL_SHOP_IMAGE_FILES[key]
  if (!rel) return null
  return localAssetUrl(rel)
}

const SHOP_ASSET_ID_TO_KEY: Record<number, keyof typeof REAL_SHOP_IMAGE_FILES> = {
  5903903949: 'passVip',
  16337655177: 'passDeveloper',
  16337461722: 'passUltimate',
  15681733281: 'passMaster',
  6031094678: 'uiClose',
  6023426978: 'uiGift',
}

export function realShopImageUrlByAssetId(assetId: number): string | null {
  const key = SHOP_ASSET_ID_TO_KEY[assetId]
  if (!key) return null
  return realShopImageUrl(key)
}

export function realProfileImageUrl(key: keyof typeof REAL_PROFILE_IMAGE_FILES): string | null {
  const rel = REAL_PROFILE_IMAGE_FILES[key]
  if (!rel) return null
  return `${getSiteAssetRoot()}${rel}`
}
