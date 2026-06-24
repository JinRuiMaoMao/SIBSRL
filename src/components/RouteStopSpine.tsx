import { useLocale } from '../i18n/LocaleContext'
import { StopTurningPointBadge } from './StopTurningPointBadge'

export type RouteStopSpineSize = 'compact' | 'promoted' | 'detail'

interface RouteStopSpineProps {
  origin: string
  destination: string
  originTurningPoint?: boolean
  destinationTurningPoint?: boolean
  stopCount: number
  size?: RouteStopSpineSize
  className?: string
}

function SpineStopName({ name, turningPoint }: { name: string; turningPoint?: boolean }) {
  return (
    <span className="route-stop-spine-name">
      <span>{name}</span>
      {turningPoint ? <StopTurningPointBadge /> : null}
    </span>
  )
}

/** 起终点竖线站序（F469 推广卡同款，支持紧凑卡片尺寸） */
export function RouteStopSpine({
  origin,
  destination,
  originTurningPoint = false,
  destinationTurningPoint = false,
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
        <SpineStopName name={origin} turningPoint={originTurningPoint} />
        <SpineStopName name={destination} turningPoint={destinationTurningPoint} />
      </div>
    </div>
  )
}
