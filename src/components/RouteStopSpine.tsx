import { useLocale } from '../i18n/LocaleContext'

export type RouteStopSpineSize = 'compact' | 'promoted' | 'detail'

interface RouteStopSpineProps {
  origin: string
  destination: string
  stopCount: number
  size?: RouteStopSpineSize
  className?: string
}

/** 起终点竖线站序（F469 推广卡同款，支持紧凑卡片尺寸） */
export function RouteStopSpine({
  origin,
  destination,
  stopCount,
  size = 'compact',
  className = '',
}: RouteStopSpineProps) {
  const { t } = useLocale()

  return (
    <div
      className={`route-stop-spine route-stop-spine--${size} ${className}`.trim()}
      aria-label={`${origin} — ${destination}`}
    >
      <span className="route-stop-spine-count">
        {t('seasonalPromotedStopCount', { count: stopCount })}
      </span>
      <div className="route-stop-spine-track" aria-hidden="true">
        <span className="route-stop-spine-dot" />
        <span className="route-stop-spine-line" />
        <span className="route-stop-spine-dot" />
      </div>
      <div className="route-stop-spine-names">
        <span>{origin}</span>
        <span>{destination}</span>
      </div>
    </div>
  )
}
