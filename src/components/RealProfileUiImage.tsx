import type { CSSProperties } from 'react'
import { realProfileUiImageUrl } from '../utils/robloxImageUrl'
import type { RealProfileUiImageKey } from '../data/realProfileAssets'

export function RealProfileUiImage({
  asset,
  className,
  alt = '',
  style,
}: {
  asset: RealProfileUiImageKey
  className?: string
  alt?: string
  style?: CSSProperties
}) {
  const src = realProfileUiImageUrl(asset)
  if (!src) return null
  return <img className={className} src={src} alt={alt} loading="lazy" decoding="async" style={style} />
}
