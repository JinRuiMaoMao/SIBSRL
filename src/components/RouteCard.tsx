import type { MouseEvent } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { getOptionalText } from '../i18n/displayText'
import type { BusRoute } from '../types/route'
import { showCardLoopMark } from '../utils/routeCategory'
import {
  getDirectionServiceTime,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import { getDirectionLengthKm } from '../utils/routeDirections'
import { formatRouteOperators } from '../utils/routeDisplay'
import { getRouteDisplayTypes } from '../utils/routeTypes'
import { getRoutePageHref } from '../utils/routeNavigation'
import { isRouteStopDataComplete } from '../utils/routeCompleteness'
import { RouteFavoriteButton } from './RouteFavoriteButton'
import { RouteDirectionControls } from './RouteDirectionControls'
import { RouteEndpoints } from './RouteEndpoints'
import { RouteTypeTags } from './RouteTypeTags'

import { getLoopViewLengthKm, routeHasLoopDirectionLayout } from '../utils/routeLoopView'

interface RouteCardProps {
  route: BusRoute
  selected: boolean
  directionIndex: number
  onDirectionChange: (index: number) => void
  loopView?: boolean
  onLoopViewChange?: (loopView: boolean) => void
  onNavigate?: (routeId: string) => void
  href?: string
  /** 分组列表中的展示编号；默认使用合并后的 route.number */
  displayNumber?: string
  /** 筛选不匹配等情况下置于列表底部时的弱化样式 */
  muted?: boolean
  /** 季节限定开放期（显示于线路号旁） */
  availabilityRangeLabel?: string
  /** 季节限定结束提示（显示于 meta 行） */
  availabilityUnavailableLabel?: string
  /** classic：最近查看等，保留原卡片外框与文字起终点 */
  appearance?: 'promoted' | 'classic'
}

export function RouteCard({
  route,
  selected,
  directionIndex,
  onDirectionChange,
  loopView = false,
  onLoopViewChange,
  onNavigate,
  href,
  displayNumber,
  muted = false,
  availabilityRangeLabel,
  availabilityUnavailableLabel,
  appearance = 'promoted',
}: RouteCardProps) {
  const { locale, t } = useLocale()
  const cardNumber = displayNumber ?? route.number
  const displayTypes = getRouteDisplayTypes(route, { directionIndex, loopView })
  const lengthKm =
    loopView && routeHasLoopDirectionLayout(route)
      ? getLoopViewLengthKm(route, locale)
      : getDirectionLengthKm(route, directionIndex, locale)
  const operatorsLabel = formatRouteOperators(route)
  const serviceTime =
    loopView && routeHasLoopDirectionLayout(route)
      ? (getOptionalText(route.serviceTime, locale) ??
        getDirectionServiceTime(route, directionIndex, locale))
      : (getDirectionServiceTime(route, directionIndex, locale) ??
        getOptionalText(route.serviceTime, locale))
  const hasDirectionControls =
    routeHasDirectionVariants(route) || routeHasLoopDirectionLayout(route)
  const dataIncomplete = !isRouteStopDataComplete(route)

  const cardHref = href ?? getRoutePageHref(route.id)

  const handleCardNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if ((event.target as Element).closest('.route-favorite-picker')) return
    if (!onNavigate) return
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    if (event.button !== 0) return
    event.preventDefault()
    onNavigate(route.id)
  }

  return (
    <div
      data-route-id={route.id}
      className={`route-card-link ${selected ? 'route-card-link--selected' : ''} ${muted ? 'route-card-link--muted' : ''}`.trim()}
    >
      <article className={`route-card${appearance === 'classic' ? ' route-card--classic' : ''}`}>
        <a
          href={cardHref}
          className="route-card-hit-area"
          aria-label={cardNumber}
          aria-current={selected ? 'page' : undefined}
          tabIndex={-1}
          onClick={handleCardNavigate}
        />
        <div className="route-card-surface">
        <div className="route-card-top">
          <div className="route-card-title">
            <span className="route-number">{cardNumber}</span>
            {availabilityRangeLabel ? (
              <span className="route-seasonal-availability">{availabilityRangeLabel}</span>
            ) : null}
            {hasDirectionControls ? (
              <RouteDirectionControls
                route={route}
                directionIndex={directionIndex}
                onDirectionChange={onDirectionChange}
                loopView={loopView}
                onLoopViewChange={onLoopViewChange ?? (() => {})}
                compact
              />
            ) : null}
            {dataIncomplete ? (
              <span className="route-completeness-badge" title={t('routeDataIncompleteHint')}>
                {t('routeDataIncomplete')}
              </span>
            ) : null}
          </div>
          <div className="route-card-top-end">
            {lengthKm && (
              <span className="route-card-km" key={`${route.id}-km-${directionIndex}`}>
                {lengthKm}
              </span>
            )}
            <RouteFavoriteButton routeId={route.id} />
          </div>
        </div>

        <RouteEndpoints
          route={route}
          directionIndex={directionIndex}
          loopView={loopView}
          layout={appearance === 'classic' ? 'text' : 'spine'}
        />

        {serviceTime && <p className="route-meta">{serviceTime}</p>}

        {availabilityUnavailableLabel ? (
          <p className="route-meta route-meta--seasonal-unavailable">{availabilityUnavailableLabel}</p>
        ) : null}

        <div className="route-card-bottom">
          <div className="route-card-meta-left">
            {displayTypes.length > 0 && (
              <RouteTypeTags types={displayTypes} compact />
            )}
            <div className="route-zones">
              {route.zones.map((z) => (
                <span key={z} className="zone-tag">
                  Z{z}
                </span>
              ))}
              {showCardLoopMark(route) && (
                <span className="zone-tag">{t('cardLoopMark')}</span>
              )}
            </div>
          </div>

          {operatorsLabel && (
            <div className="route-card-foot">
              <span className="route-card-operators">{operatorsLabel}</span>
            </div>
          )}
        </div>
        </div>
      </article>
    </div>
  )
}
