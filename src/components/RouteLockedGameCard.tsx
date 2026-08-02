import type { MouseEvent } from 'react'
import { getRouteDisplayGroupsForRoute } from '../data/routeDisplayGroups'
import {
  formatSeasonalAvailabilityRangeInGame,
  getSeasonalRouteDisplayWindow,
} from '../data/seasonalRouteAvailability'
import {
  formatShiftUnlockPrerequisitesForLockedCard,
  getShiftUnlockPrerequisites,
  lockedCardDisplayNumber,
  routeBelongsToShiftUnlockCategory,
} from '../data/routeShiftUnlocks'
import { routeUsesSunshardUnlock } from '../data/routeUnlocks'
import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute, RouteTypeFilter } from '../types/route'
import { getRoutePageHref } from '../utils/routeNavigation'
import { getRouteDisplayTypes } from '../utils/routeTypes'
import { OperatorLogos } from './OperatorLogos'
import { RouteTypeTags } from './RouteTypeTags'

interface RouteLockedGameCardProps {
  route: BusRoute
  directionIndex: number
  displayNumber?: string
  listedId?: string
  selected: boolean
  href?: string
  tourAnchor?: string
  onNavigate?: (routeId: string) => void
  onOpenDetail?: () => void
}

function getLockedGameDisplayTypes(route: BusRoute, directionIndex: number): RouteTypeFilter[] {
  const types = getRouteDisplayTypes(route, { directionIndex, loopView: false })
  const groups = getRouteDisplayGroupsForRoute(route)
  if (groups.includes('seasonal') && !types.includes('festival')) {
    return ['festival', ...types]
  }
  if (route.id === 'C401A') {
    const directionKey = route.stops?.[directionIndex]?.directionKey
    if (directionKey === 'N' && !types.includes('specialDeparture')) {
      return ['specialDeparture', ...types]
    }
  }
  return types
}

function BusGlyph() {
  return (
    <svg className="route-locked-game-card-bus" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M6 3a2 2 0 0 0-2 2v11a3 3 0 0 0 3 3h1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h4v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h1a3 3 0 0 0 3-3V5a2 2 0 0 0-2-2zm0 2h12v8H6zm2 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"
      />
    </svg>
  )
}

function CalendarGlyph() {
  return (
    <svg className="route-locked-game-card-calendar" viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <path
        fill="currentColor"
        d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1m12 6H5v12h14z"
      />
    </svg>
  )
}

function SunShardGlyph() {
  return (
    <svg className="route-locked-game-card-sun-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        fill="currentColor"
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LockGlyph() {
  return (
    <svg className="route-locked-game-card-lock" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2zm2 0h6V8a3 3 0 0 0-6 0z"
      />
    </svg>
  )
}

export function RouteLockedGameCard({
  route,
  directionIndex,
  displayNumber,
  listedId,
  selected,
  href,
  tourAnchor,
  onNavigate,
  onOpenDetail,
}: RouteLockedGameCardProps) {
  const { locale, t } = useLocale()
  const cardNumber = displayNumber ?? route.number
  const displayTypes = getLockedGameDisplayTypes(route, directionIndex)
  const seasonalWindow = getSeasonalRouteDisplayWindow(route)
  const dateRange = seasonalWindow
    ? formatSeasonalAvailabilityRangeInGame(seasonalWindow, locale)
    : null
  const usesSunshardUnlock = routeUsesSunshardUnlock(route)
  const shiftUnlock = getShiftUnlockPrerequisites(route, { listedId, directionIndex })
  const cardHref = href ?? getRoutePageHref(route.id)

  const handleCardClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(route.id)
  }

  const handleCardDoubleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpenDetail) return
    event.preventDefault()
    onOpenDetail()
  }

  return (
    <div
      data-route-id={route.id}
      data-tour={tourAnchor}
      className={`route-card-link route-card-link--locked-game ${selected ? 'route-card-link--selected' : ''}`.trim()}
    >
      <article className="route-locked-game-card">
        <a
          href={cardHref}
          className="route-card-hit-area"
          aria-label={cardNumber}
          aria-current={selected ? 'page' : undefined}
          tabIndex={-1}
          onClick={handleCardClick}
          onDoubleClick={handleCardDoubleClick}
        />
        <div className="route-locked-game-card-header">
          <div className="route-locked-game-card-id">
            <BusGlyph />
            <span className="route-number route-locked-game-card-number">{cardNumber}</span>
          </div>
          {dateRange ? (
            <div className="route-locked-game-card-date">
              <span className="route-locked-game-card-date-icon-wrap">
                <CalendarGlyph />
              </span>
              <span className="route-locked-game-card-date-text">{dateRange}</span>
            </div>
          ) : usesSunshardUnlock && route.sunshardsRequired != null && !isShiftUnlockRoute ? (
            <div className="route-locked-game-card-unlock-pill">
              <span className="route-locked-game-card-unlock-pill-text">
                {t('routeLockedGameUnlockSunshards', { n: route.sunshardsRequired })}
              </span>
              <span className="route-locked-game-card-unlock-sun-wrap">
                <SunShardGlyph />
              </span>
            </div>
          ) : null}
        </div>

        {shiftUnlockLabel ? (
          <div className="route-locked-game-card-unlock-row">
            <LockGlyph />
            <span className="route-locked-game-card-prereq">{shiftUnlockLabel}</span>
          </div>
        ) : null}

        {route.operators.length > 0 ? (
          <div className="route-locked-game-card-operators">
            <OperatorLogos operators={route.operators} size="card" />
          </div>
        ) : null}

        {displayTypes.length > 0 ? (
          <div className="route-locked-game-card-tags">
            <RouteTypeTags types={displayTypes} compact />
          </div>
        ) : null}
      </article>
    </div>
  )
}
