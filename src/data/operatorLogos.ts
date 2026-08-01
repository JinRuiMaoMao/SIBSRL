import { resolveSiteAssetUrl } from '../utils/appLayoutMode'

/** Operator codes with synced PNG logos under company-logos/. */
export const OPERATOR_LOGO_FILES: Record<string, string> = {
  CSB: 'csb.png',
  FT: 'ft.png',
  HZ: 'hz.png',
  REBC: 'rebc.png',
  FTCC: 'ftcc.png',
}

export function operatorHasLogo(operatorCode: string): boolean {
  return operatorCode.toUpperCase() in OPERATOR_LOGO_FILES
}

export function getOperatorLogoUrl(operatorCode: string): string | null {
  const file = OPERATOR_LOGO_FILES[operatorCode.toUpperCase()]
  if (!file) return null
  return resolveSiteAssetUrl(`company-logos/${file}`)
}
