import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { RouteStop } from '../types/route'
import { StopNameDisplay } from './StopNameDisplay'

export type RouteStopSpineSize = 'compact' | 'promoted' | 'detail'

interface RouteStopSpineProps {
  originStop: Pick<RouteStop, 'name' | 'nameSub' | 'turningPoint'>
  destinationStop: Pick<RouteStop, 'name' | 'nameSub' | 'turningPoint'>
  stopCount: number
  size?: RouteStopSpineSize
  className?: string
}

/** 起终点竖线站序（F469 推广卡同款，支持紧凑卡片尺寸） */
export function RouteStopSpine({
  originStop,
  destinationStop,
  stopCount,
  size = 'compact',
  className = '',
}: RouteStopSpineProps) {
  const { t, locale } = useLocale()
  const originLabel = getPrimaryText(originStop.name, locale)
  const destinationLabel = getPrimaryText(destinationStop.name, locale)

  return (
    <div
      className={`route-stop-spine route-stop-spine--${size} ${className}`.trim()}
      aria-label={`${originLabel} — ${destinationLabel}`}
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
        <StopNameDisplay stop={originStop} className="route-stop-spine-name" />
        <StopNameDisplay stop={destinationStop} className="route-stop-spine-name" />
      </div>
    </div>
  )
}
