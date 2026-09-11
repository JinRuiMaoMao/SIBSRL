import { resolveSiteAssetUrl } from '../utils/appLayoutMode'

/** 游戏内阳光碎片 UI 色 */
export const SUNSHARD_COLOR = 'rgb(255, 170, 127)'

const SUNSHARD_ICON_URL = resolveSiteAssetUrl('sunshard-icon.png')

export function SunshardIcon({
  className,
  size = 18,
}: {
  className?: string
  size?: number
}) {
  return (
    <span
      className={`sunshard-icon${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url("${SUNSHARD_ICON_URL}")`,
        maskImage: `url("${SUNSHARD_ICON_URL}")`,
      }}
      aria-hidden
    />
  )
}
