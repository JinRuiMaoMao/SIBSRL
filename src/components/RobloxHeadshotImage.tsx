import { useState } from 'react'
import { robloxHeadshotAssetUrl } from '../utils/robloxImageUrl'

export function RobloxHeadshotImage({
  userId,
  displayName,
  className,
  size = 48,
}: {
  userId: number
  displayName: string
  className?: string
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const initial = displayName.slice(0, 1).toUpperCase() || '?'
  const src = failed ? null : robloxHeadshotAssetUrl(userId)

  if (!src || failed) {
    return (
      <span
        className={`${className ?? ''} roblox-headshot-fallback`.trim()}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {initial}
      </span>
    )
  }

  return (
    <img
      className={className}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
