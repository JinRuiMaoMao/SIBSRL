import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { RouteStop } from '../types/route'
import { resolveStopDisplay } from '../utils/stopTurningPoint'
import { StopTurningPointBadge } from './StopTurningPointBadge'

interface StopNameDisplayProps {
  stop: Pick<RouteStop, 'name' | 'nameSub' | 'turningPoint'>
  className?: string
}

export function StopNameDisplay({ stop, className = '' }: StopNameDisplayProps) {
  const { locale } = useLocale()
  const display = resolveStopDisplay(stop)
  const name = getPrimaryText(display.name, locale)
  const nameSub = display.nameSub ? getPrimaryText(display.nameSub, locale) : null

  return (
    <span className={`stop-name ${className}`.trim()}>
      <span className="stop-name-main">
        <span className="stop-name-zh">{name}</span>
        {display.turningPoint ? <StopTurningPointBadge /> : null}
      </span>
      {nameSub ? <span className="stop-name-sub">{nameSub}</span> : null}
    </span>
  )
}
