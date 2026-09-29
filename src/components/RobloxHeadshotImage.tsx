import { useEffect, useState } from 'react'
import {
  getCachedRobloxHeadshot,
  robloxLegacyHeadshotUrl,
  subscribeRobloxHeadshotBatch,
} from '../utils/robloxThumbnail'

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
  const [, setTick] = useState(0)
  const cached = getCachedRobloxHeadshot(userId)
  const [failed, setFailed] = useState(false)
  const initial = displayName.slice(0, 1).toUpperCase() || '?'

  useEffect(() => {
    setFailed(false)
    return subscribeRobloxHeadshotBatch([userId], () => setTick((n) => n + 1))
  }, [userId])

  const src = failed ? null : (cached ?? robloxLegacyHeadshotUrl(userId, Math.max(size, 150)))

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
