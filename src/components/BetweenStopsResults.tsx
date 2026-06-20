import { useMemo } from 'react'
import type { DailyChallengeInfo } from '../data/dailyChallenge'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { BusRoute } from '../types/route'
import type { TransferPlan } from '../types/transferPlan'
import { getBetweenStopRouteBadgeKeys } from '../utils/betweenStopRouteLabels'
import type { DirectRouteBetweenStops } from '../utils/routeBetweenStops'
import { buildStopPairShareUrl } from '../utils/routeNavigation'
import {
  sortTransferPlans,
  type TransferPlanSortMode,
} from '../utils/stopTransferPlans'
import { RouteCard } from './RouteCard'
import { TransferPlanList } from './TransferPlanList'

export interface BetweenStopLookupResult {
  from: { zh: string; en: string } | null
  to: { zh: string; en: string } | null
  fromQuery: string
  toQuery: string
  routes: DirectRouteBetweenStops[]
  transferPlans: TransferPlan[]
}

interface BetweenStopsResultsProps {
  lookup: BetweenStopLookupResult
  dailyChallenge: DailyChallengeInfo
  departTime: string
  sortMode: TransferPlanSortMode
  onSortModeChange: (mode: TransferPlanSortMode) => void
  onDepartTimeChange: (value: string) => void
  selectedRouteId: string | undefined
  getDirectionIndex: (route: BusRoute) => number
  setDirectionIndex: (routeId: string, index: number) => void
  onRouteNavigate: (routeId: string) => void
  onSelectPlan: (plan: TransferPlan, planIndex: number) => void
}

export function BetweenStopsResults({
  lookup,
  dailyChallenge,
  departTime,
  sortMode,
  onSortModeChange,
  onDepartTimeChange,
  selectedRouteId,
  getDirectionIndex,
  setDirectionIndex,
  onRouteNavigate,
  onSelectPlan,
}: BetweenStopsResultsProps) {
  const { locale, t } = useLocale()
  const { from, to, fromQuery, toQuery, routes, transferPlans } = lookup

  const sortedPlans = useMemo(
    () => sortTransferPlans(transferPlans, sortMode, locale),
    [transferPlans, sortMode, locale],
  )

  const summary = useMemo(() => {
    if (!from) return t('betweenStopsFromUnresolved', { query: fromQuery })
    if (!to) return t('betweenStopsToUnresolved', { query: toQuery })
    const fromLabel = getPrimaryText({ zh: from.zh, en: from.en }, locale)
    const toLabel = getPrimaryText({ zh: to.zh, en: to.en }, locale)
    return t('betweenStopsSummary', { from: fromLabel, to: toLabel })
  }, [from, to, fromQuery, toQuery, locale, t])

  const disambiguationNotes = useMemo(() => {
    const notes: string[] = []
    if (from && fromQuery.trim() !== from.zh && !from.zh.includes(fromQuery.trim())) {
      notes.push(t('betweenStopsResolvedFrom', { query: fromQuery, stop: from.zh }))
    }
    if (to && toQuery.trim() !== to.zh && !to.zh.includes(toQuery.trim())) {
      notes.push(t('betweenStopsResolvedTo', { query: toQuery, stop: to.zh }))
    }
    return notes
  }, [from, to, fromQuery, toQuery, t])

  const handleShare = async () => {
    if (!from || !to) return
    const url = buildStopPairShareUrl(fromQuery, toQuery, departTime || null)
    try {
      if (navigator.share) {
        await navigator.share({ title: summary, url })
        return
      }
    } catch {
      /* user cancelled */
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt(t('betweenStopsSharePrompt'), url)
    }
  }

  const sortOptions: TransferPlanSortMode[] = ['transfers', 'time', 'distance']
  const hasAnyResult = routes.length > 0 || sortedPlans.length > 0

  return (
    <>
      <p className="stop-lookup-summary">{summary}</p>
      {disambiguationNotes.map((note) => (
        <p key={note} className="between-stops-note">
          {note}
        </p>
      ))}

      <div className="between-stops-toolbar">
        <label className="between-stops-depart">
          <span>{t('betweenStopsDepartLabel')}</span>
          <input
            type="time"
            value={departTime}
            onChange={(event) => onDepartTimeChange(event.target.value)}
            aria-label={t('betweenStopsDepartLabel')}
          />
        </label>
        <div className="between-stops-sort" role="group" aria-label={t('betweenStopsSortLabel')}>
          {sortOptions.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`between-stops-sort-btn ${sortMode === mode ? 'is-active' : ''}`.trim()}
              onClick={() => onSortModeChange(mode)}
            >
              {t(
                mode === 'transfers'
                  ? 'betweenStopsSortTransfers'
                  : mode === 'time'
                    ? 'betweenStopsSortTime'
                    : 'betweenStopsSortDistance',
              )}
            </button>
          ))}
        </div>
        {from && to ? (
          <button type="button" className="between-stops-share-btn" onClick={() => void handleShare()}>
            {t('betweenStopsShare')}
          </button>
        ) : null}
      </div>

      {routes.length > 0 ? (
        <section className="between-stops-section">
          <h3 className="between-stops-section-title">{t('betweenStopsDirectHeading')}</h3>
          <div className="route-grid">
            {routes.map(({ route, directionIndex }) => {
              const badges = getBetweenStopRouteBadgeKeys(route, dailyChallenge)
              return (
                <div key={`between-${route.id}-${directionIndex}`} className="between-stops-route-wrap">
                  {badges.length > 0 ? (
                    <div className="between-stops-badges">
                      {badges.map((badge) => (
                        <span key={badge} className={`between-stops-badge between-stops-badge--${badge}`}>
                          {t(
                            badge === 'seasonal'
                              ? 'betweenStopsBadgeSeasonal'
                              : badge === 'daily'
                                ? 'betweenStopsBadgeDaily'
                                : 'betweenStopsBadgeLimited',
                          )}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <RouteCard
                    route={route}
                    selected={selectedRouteId === route.id}
                    directionIndex={directionIndex}
                    onDirectionChange={(index) => setDirectionIndex(route.id, index)}
                    onNavigate={(routeId) => {
                      setDirectionIndex(routeId, directionIndex)
                      onRouteNavigate(routeId)
                    }}
                  />
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {sortedPlans.length > 0 ? (
        <section className="between-stops-section">
          <TransferPlanList plans={sortedPlans} onSelectPlan={onSelectPlan} />
        </section>
      ) : null}

      {!hasAnyResult && from && to ? (
        <p className="route-group-empty">{t('betweenStopsNoRoutes')}</p>
      ) : null}
    </>
  )
}
