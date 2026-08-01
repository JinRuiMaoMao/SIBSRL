import { useState } from 'react'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useLocale } from '../i18n/LocaleContext'
import { getOptionalText, getPrimaryText } from '../i18n/displayText'
import { showCircularLineBesideNumber } from '../utils/routeCategory'
import { getRouteDisplayTypes } from '../utils/routeTypes'
import type { DailyChallengeIntro as DailyChallengeIntroContent } from '../data/dailyChallenge'
import type { BilingualText, BusRoute } from '../types/route'
import {
  getDirectionLengthKm,
  getDirectionServiceTime,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import {
  getLoopViewLengthKm,
  resolveActiveStopGroup,
  routeHasLoopDirectionLayout,
} from '../utils/routeLoopView'
import { formatRouteOperators } from '../utils/routeDisplay'
import {
  formatShortJourneyTime,
  routeDifficultyStars,
} from '../utils/routeRealDisplay'
import { buildRouteShareUrl } from '../utils/routeNavigation'
import type { RoutePageData } from '../types/routePageData'
import { RouteDirectionControls } from './RouteDirectionControls'
import { RouteTypeTags } from './RouteTypeTags'
import { RouteFavoriteButton } from './RouteFavoriteButton'
import { RouteMapViewButtons } from './RouteMapViewButtons'
import { RouteRealTimeline } from './RouteRealTimeline'
import { DailyChallengeIntro } from './DailyChallengeIntro'

interface RouteDetailRealPanelProps {
  route: BusRoute
  directionIndex: number
  onDirectionChange: (index: number) => void
  loopView?: boolean
  onLoopViewChange?: (loopView: boolean) => void
  onClose: () => void
  pageData?: RoutePageData | null
  dailyChallengeIntro?: DailyChallengeIntroContent | null
  lockDirection?: boolean
  directionEndpoints?: BilingualText | null
}

function DifficultyStars({ count }: { count: number }) {
  const { t } = useLocale()
  if (count <= 0) return null

  return (
    <div className="route-real-panel-difficulty" aria-label={t('realRouteDifficulty')}>
      <span className="route-real-panel-difficulty-label">{t('realRouteDifficulty')}</span>
      <span className="route-real-panel-stars" aria-hidden="true">
        {[1, 2, 3].map((star) => (
          <span
            key={star}
            className={`route-real-panel-star${star <= count ? ' route-real-panel-star--filled' : ''}`}
          >
            ★
          </span>
        ))}
      </span>
    </div>
  )
}

export function RouteDetailRealPanel({
  route,
  directionIndex,
  onDirectionChange,
  loopView = false,
  onLoopViewChange,
  onClose,
  pageData: _pageData = null,
  dailyChallengeIntro = null,
  lockDirection = false,
  directionEndpoints: _directionEndpoints = null,
}: RouteDetailRealPanelProps) {
  const { locale, t } = useLocale()
  const { alert } = useAppDialog()
  const [collapsed, setCollapsed] = useState(false)

  const hasDirectionControls =
    routeHasDirectionVariants(route) || routeHasLoopDirectionLayout(route)
  const activeStops = resolveActiveStopGroup(route, directionIndex, loopView)
  const stopCount = activeStops?.list.length ?? 0
  const lengthKm =
    loopView && routeHasLoopDirectionLayout(route)
      ? getLoopViewLengthKm(route, locale)
      : getDirectionLengthKm(route, directionIndex, locale)
  const journeyLabel = formatShortJourneyTime(route.journeyTime, locale)
  const serviceTimeText =
    loopView && routeHasLoopDirectionLayout(route)
      ? (getOptionalText(route.serviceTime, locale) ??
        getDirectionServiceTime(route, directionIndex, locale))
      : getDirectionServiceTime(route, directionIndex, locale)
  const displayTypes = getRouteDisplayTypes(route, { directionIndex, loopView })
  const difficulty = routeDifficultyStars(route.levelRequired)
  const operatorsLabel = formatRouteOperators(route)
  const fareText =
    route.fare != null
      ? typeof route.fare === 'string'
        ? route.fare
        : getPrimaryText(route.fare, locale)
      : null

  const handleShare = () => {
    const url = new URL(buildRouteShareUrl(route.id, directionIndex), window.location.href).href
    void navigator.clipboard.writeText(url).then(
      () => alert({ message: t('shareRouteCopied') }),
      () => alert({ message: t('shareRouteCopyManual'), detail: url }),
    )
  }

  return (
    <article
      className={`route-real-panel${collapsed ? ' route-real-panel--collapsed' : ''}`}
      aria-label={t('detailAria', { number: route.number })}
    >
      <div className="route-real-panel-chrome">
        <button
          type="button"
          className="route-real-panel-collapse"
          onClick={() => setCollapsed((current) => !current)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('realRouteExpandPanel') : t('realRouteCollapsePanel')}
        >
          <span aria-hidden="true">{collapsed ? '›' : '⌄'}</span>
        </button>
        <h2 className="route-real-panel-tab">{t('realRouteDetailTab')}</h2>
        <button
          type="button"
          className="route-real-panel-close"
          onClick={onClose}
          aria-label={t('closeDetail')}
        >
          ×
        </button>
      </div>

      {!collapsed ? (
        <>
          <div className="route-real-panel-overview">
            <div className="route-real-panel-route-id">
              <span className="route-real-panel-bus" aria-hidden="true">
                🚌
              </span>
              <div className="route-real-panel-route-title">
                <span className="route-real-panel-number">{route.number}</span>
                {showCircularLineBesideNumber(route) ? (
                  <span className="route-real-panel-loop-tag">{t('circularLineBadge')}</span>
                ) : null}
                {displayTypes.length > 0 ? <RouteTypeTags types={displayTypes} /> : null}
              </div>
            </div>

            <ul className="route-real-panel-stats" aria-label={t('realRouteStatsAria')}>
              {journeyLabel ? (
                <li className="route-real-panel-stat">
                  <span className="route-real-panel-stat-icon" aria-hidden="true">
                    🕐
                  </span>
                  <span>{journeyLabel}</span>
                </li>
              ) : null}
              {stopCount > 0 ? (
                <li className="route-real-panel-stat">
                  <span className="route-real-panel-stat-icon" aria-hidden="true">
                    📍
                  </span>
                  <span>{t('realRouteStopsCount', { count: stopCount })}</span>
                </li>
              ) : null}
              {lengthKm ? (
                <li className="route-real-panel-stat">
                  <span className="route-real-panel-stat-icon" aria-hidden="true">
                    ↔
                  </span>
                  <span>{lengthKm}</span>
                </li>
              ) : null}
            </ul>

            {activeStops?.list.length ? (
              <RouteRealTimeline stops={activeStops.list} className="route-real-panel-timeline" />
            ) : null}

            <DifficultyStars count={difficulty} />
          </div>

          <div className="route-real-panel-divider" aria-hidden="true" />

          {dailyChallengeIntro ? (
            <DailyChallengeIntro intro={dailyChallengeIntro} className="route-real-panel-section" />
          ) : null}

          <div className="route-real-panel-meta">
            {serviceTimeText ? (
              <div className="route-real-panel-meta-item">
                <span className="route-real-panel-meta-label">{t('serviceTime')}</span>
                <span className="route-real-panel-meta-value">{serviceTimeText}</span>
              </div>
            ) : null}
            {fareText ? (
              <div className="route-real-panel-meta-item">
                <span className="route-real-panel-meta-label">{t('fare')}</span>
                <span className="route-real-panel-meta-value">{fareText}</span>
              </div>
            ) : null}
            {operatorsLabel ? (
              <div className="route-real-panel-meta-item">
                <span className="route-real-panel-meta-label">{t('operator')}</span>
                <span className="route-real-panel-meta-value">{operatorsLabel}</span>
              </div>
            ) : null}
            {route.levelRequired != null ? (
              <div className="route-real-panel-meta-item">
                <span className="route-real-panel-meta-label">{t('levelRequired')}</span>
                <span className="route-real-panel-meta-value">
                  {t('unlockLevelLine', { n: route.levelRequired })}
                </span>
              </div>
            ) : null}
          </div>

          {hasDirectionControls && !lockDirection ? (
            <div className="route-real-panel-direction">
              <RouteDirectionControls
                route={route}
                directionIndex={directionIndex}
                onDirectionChange={onDirectionChange}
                loopView={loopView}
                onLoopViewChange={onLoopViewChange ?? (() => {})}
              />
            </div>
          ) : null}

          <div className="route-real-panel-actions">
            <RouteMapViewButtons
              routeId={route.id}
              routeNumber={route.number}
              directionIndex={directionIndex}
            />
            <button type="button" className="route-real-panel-action route-real-panel-action--share" onClick={handleShare}>
              {t('shareRoute')}
            </button>
            <RouteFavoriteButton routeId={route.id} className="route-favorite-btn--real" />
            {route.externalUrl ? (
              <a
                className="route-real-panel-action route-real-panel-action--link"
                href={route.externalUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t('linkCommunity')}
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <div className="route-real-panel-collapsed-summary">
          <span className="route-real-panel-bus" aria-hidden="true">
            🚌
          </span>
          <span className="route-real-panel-number">{route.number}</span>
          {journeyLabel ? <span className="route-real-panel-collapsed-meta">{journeyLabel}</span> : null}
        </div>
      )}
    </article>
  )
}
