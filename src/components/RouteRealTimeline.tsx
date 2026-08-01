import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { RouteStop } from '../types/route'
import { resolveStopDisplay } from '../utils/stopTurningPoint'
import { StopNameDisplay } from './StopNameDisplay'

interface RouteRealTimelineProps {
  stops: readonly RouteStop[]
  className?: string
}

function findTimelineTurningStop(stops: readonly RouteStop[]): RouteStop | null {
  if (stops.length < 3) return null
  for (let index = 1; index < stops.length - 1; index += 1) {
    const stop = stops[index]!
    if (resolveStopDisplay(stop).turningPoint) return stop
  }
  return null
}

/** real 模式：横向起讫时间轴（参考游戏选线界面） */
export function RouteRealTimeline({ stops, className = '' }: RouteRealTimelineProps) {
  const { locale } = useLocale()

  if (stops.length === 0) return null

  const origin = stops[0]!
  const destination = stops[stops.length - 1]!
  const turningStop = findTimelineTurningStop(stops)

  const nodes = turningStop
    ? [
        { stop: origin, key: 'origin' },
        { stop: turningStop, key: 'turning' },
        { stop: destination, key: 'destination' },
      ]
    : [
        { stop: origin, key: 'origin' },
        { stop: destination, key: 'destination' },
      ]

  return (
    <div
      className={`route-real-timeline ${className}`.trim()}
      aria-label={`${getPrimaryText(origin.name, locale)} — ${getPrimaryText(destination.name, locale)}`}
    >
      <div className="route-real-timeline-track" aria-hidden="true">
        {nodes.map((node, index) => (
          <span key={node.key} className="route-real-timeline-node-wrap">
            <span className="route-real-timeline-dot" />
            {index < nodes.length - 1 ? <span className="route-real-timeline-segment" /> : null}
          </span>
        ))}
      </div>
      <div className="route-real-timeline-labels">
        {nodes.map((node) => (
          <div key={node.key} className="route-real-timeline-label">
            <StopNameDisplay stop={node.stop} className="route-real-timeline-name" />
          </div>
        ))}
      </div>
    </div>
  )
}
