import { getSiteAssetRoot } from '../utils/appLayoutMode'

/** 由 scripts/sync-brand-assets.mjs 从 E:\\SIBS资源\\SIBS Logo.png 同步 */
export function getSiteLogoUrl(): string {
  return `${getSiteAssetRoot()}sibs-logo.png`
}

/** @deprecated 请使用 getSiteLogoUrl()，以支持 normal/、real/ 子目录与 GitHub Pages BASE */
export const SITE_LOGO_URL = './sibs-logo.png'
