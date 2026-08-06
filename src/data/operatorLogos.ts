import csbLogo from '../assets/operator-logos/csb.png'
import ftLogo from '../assets/operator-logos/ft.png'
import ftccLogo from '../assets/operator-logos/ftcc.png'
import hzLogo from '../assets/operator-logos/hz.png'
import rebcLogo from '../assets/operator-logos/rebc.png'
import { resolveSiteAssetUrl } from '../utils/appLayoutMode'

/** Operator codes with bundled PNG logos (also synced to company-logos/ for static hosting). */
const OPERATOR_LOGO_URLS: Record<string, string> = {
  CSB: csbLogo,
  FT: ftLogo,
  HZ: hzLogo,
  REBC: rebcLogo,
  FTCC: ftccLogo,
}

export const OPERATOR_LOGO_FILES: Record<string, string> = {
  CSB: 'csb.png',
  FT: 'ft.png',
  HZ: 'hz.png',
  REBC: 'rebc.png',
  FTCC: 'ftcc.png',
}

export function operatorHasLogo(operatorCode: string): boolean {
  return operatorCode.toUpperCase() in OPERATOR_LOGO_URLS
}

export function getOperatorLogoUrl(operatorCode: string): string | null {
  const bundled = OPERATOR_LOGO_URLS[operatorCode.toUpperCase()]
  if (!bundled) return null
  return resolveSiteAssetUrl(bundled)
}
