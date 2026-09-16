import { resolveSiteAssetUrl } from '../utils/appLayoutMode'

const ROBUX_ICON_URL = resolveSiteAssetUrl('robux-icon.svg')

export function RobuxIcon({
  className,
  size = 16,
}: {
  className?: string
  size?: number
}) {
  const height = Math.round(size * (26.1 / 24))

  return (
    <img
      className={`robux-icon${className ? ` ${className}` : ''}`}
      src={ROBUX_ICON_URL}
      alt=""
      width={size}
      height={height}
      aria-hidden
      draggable={false}
    />
  )
}
