import { useState } from 'react'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import {
  formatTransferPlanRouteChain,
  getStopsOnLeg,
  type TransferPlan,
} from '../utils/stopTransferPlans'

interface TransferPlanListProps {
  plans: TransferPlan[]
  onOpenLeg: (routeId: string, directionIndex: number) => void
}

function stopLabel(
  stop: { zh: string; en: string },
  locale: ReturnType<typeof useLocale>['locale'],
): string {
  return getPrimaryText({ zh: stop.zh, en: stop.en }, locale)
}

export function TransferPlanList({ plans, onOpenLeg }: TransferPlanListProps) {
  const { locale, t } = useLocale()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <div className="transfer-plan-list">
      <p className="transfer-plan-heading">{t('transferPlanHeading')}</p>
      {plans.map((plan, planIndex) => {
        const expanded = expandedIndex === planIndex
        const routeChain = formatTransferPlanRouteChain(plan)
        const panelId = `transfer-plan-panel-${planIndex}`

        return (
          <article
            key={planIndex}
            className={`transfer-plan-card ${expanded ? 'is-expanded' : ''}`.trim()}
          >
            <button
              type="button"
              className="transfer-plan-card-trigger"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setExpandedIndex(expanded ? null : planIndex)}
            >
              <span className="transfer-plan-card-main">
                <span className="transfer-plan-title">
                  {t('transferPlanTitle', {
                    index: planIndex + 1,
                    transfers: plan.transferCount,
                  })}
                </span>
                <span className="transfer-plan-route-chain">{routeChain}</span>
              </span>
              <span className="transfer-plan-card-hint">
                {expanded ? t('transferPlanCollapse') : t('transferPlanExpand')}
              </span>
              <svg
                className="transfer-plan-card-icon"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden
              >
                <path fill="currentColor" d="M12 7.5 18 13.5l-1.4 1.4L12 10.3 7.4 14.9 6 13.5z" />
              </svg>
            </button>

            {expanded ? (
              <div id={panelId} className="transfer-plan-detail">
                {plan.legs.map((leg, legIndex) => {
                  const stops = getStopsOnLeg(leg)
                  const directionLabel = getPrimaryText(
                    leg.route.stops?.[leg.directionIndex]?.direction ?? {
                      zh: '',
                      en: '',
                    },
                    locale,
                  )
                  const displayStops =
                    legIndex === 0 ? stops : stops.slice(1)

                  return (
                    <div
                      key={`${planIndex}-${legIndex}-${leg.route.id}`}
                      className="transfer-plan-segment"
                    >
                      {legIndex > 0 ? (
                        <p className="transfer-plan-transfer-node">
                          {t('transferPlanTransferAt', {
                            stop: stopLabel(leg.from, locale),
                          })}
                        </p>
                      ) : null}

                      <div className="transfer-plan-segment-head">
                        <button
                          type="button"
                          className="transfer-plan-route-link"
                          onClick={() => onOpenLeg(leg.route.id, leg.directionIndex)}
                        >
                          {t('transferPlanBoardRoute', { route: leg.route.number })}
                        </button>
                        {directionLabel ? (
                          <span className="transfer-plan-direction">{directionLabel}</span>
                        ) : null}
                        <span className="transfer-plan-stop-count">
                          {t('transferPlanStopCount', { count: displayStops.length })}
                        </span>
                      </div>

                      <ol className="transfer-plan-stops">
                        {displayStops.map((stop, stopIndex) => {
                          const isOrigin = legIndex === 0 && stopIndex === 0
                          const isDestination =
                            legIndex === plan.legs.length - 1 &&
                            stopIndex === displayStops.length - 1
                          const isTransferAlight =
                            legIndex < plan.legs.length - 1 &&
                            stopIndex === displayStops.length - 1

                          return (
                            <li
                              key={`${leg.route.id}-${stopIndex}-${stop.zh}-${stop.en}`}
                              className={[
                                'transfer-plan-stop',
                                isOrigin ? 'is-origin' : '',
                                isDestination ? 'is-destination' : '',
                                isTransferAlight ? 'is-transfer-alight' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              <span className="transfer-plan-stop-name">
                                {stopLabel(stop, locale)}
                              </span>
                              {isOrigin ? (
                                <span className="transfer-plan-stop-tag">
                                  {t('transferPlanOriginTag')}
                                </span>
                              ) : null}
                              {isTransferAlight ? (
                                <span className="transfer-plan-stop-tag">
                                  {t('transferPlanTransferTag')}
                                </span>
                              ) : null}
                              {isDestination ? (
                                <span className="transfer-plan-stop-tag">
                                  {t('transferPlanDestinationTag')}
                                </span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
