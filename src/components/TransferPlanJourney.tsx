import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { MatchedStop } from '../utils/stopCanonicalIndex'
import { getStopsOnLeg, type TransferPlan } from '../utils/stopTransferPlans'
import { StopNameDisplay } from './StopNameDisplay'

interface TransferPlanJourneyProps {
  plan: TransferPlan
  onOpenLeg?: (routeId: string, directionIndex: number) => void
}

function matchedStopToDisplay(stop: MatchedStop) {
  return {
    name: { zh: stop.zh, en: stop.en },
    nameSub: stop.nameSub,
    turningPoint: stop.turningPoint,
  }
}

function stopLabel(
  stop: MatchedStop,
  locale: ReturnType<typeof useLocale>['locale'],
): string {
  const display = matchedStopToDisplay(stop)
  const main = getPrimaryText(display.name, locale)
  const sub = display.nameSub ? getPrimaryText(display.nameSub, locale) : null
  return sub ? `${main} (${sub})` : main
}

export function TransferPlanJourney({ plan, onOpenLeg }: TransferPlanJourneyProps) {
  const { locale, t } = useLocale()
  const hasWalk = plan.walkToDestination != null

  return (
    <div className="transfer-plan-journey">
      {plan.legs.map((leg, legIndex) => {
        const stops = getStopsOnLeg(leg)
        const directionLabel = getPrimaryText(
          leg.route.stops?.[leg.directionIndex]?.direction ?? { zh: '', en: '' },
          locale,
        )
        const displayStops = legIndex === 0 ? stops : stops.slice(1)
        const isLastBusLeg = legIndex === plan.legs.length - 1

        return (
          <section
            key={`${legIndex}-${leg.route.id}-${leg.directionIndex}`}
            className="transfer-plan-segment"
          >
            {legIndex > 0 ? (
              <p className="transfer-plan-transfer-node">
                {t('transferPlanTransferAt', { stop: stopLabel(leg.from, locale) })}
              </p>
            ) : null}

            <div className="transfer-plan-segment-head">
              {onOpenLeg ? (
                <button
                  type="button"
                  className="transfer-plan-route-link"
                  onClick={() => onOpenLeg(leg.route.id, leg.directionIndex)}
                >
                  {t('transferPlanBoardRoute', { route: leg.route.number })}
                </button>
              ) : (
                <span className="transfer-plan-route-label">
                  {t('transferPlanBoardRoute', { route: leg.route.number })}
                </span>
              )}
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
                const isBusDestination =
                  !hasWalk && isLastBusLeg && stopIndex === displayStops.length - 1
                const isWalkAlight =
                  hasWalk && isLastBusLeg && stopIndex === displayStops.length - 1
                const isTransferAlight =
                  !isLastBusLeg && stopIndex === displayStops.length - 1

                return (
                  <li
                    key={`${leg.route.id}-${stopIndex}-${stop.zh}-${stop.en}`}
                    className={[
                      'transfer-plan-stop',
                      isOrigin ? 'is-origin' : '',
                      isBusDestination ? 'is-destination' : '',
                      isWalkAlight ? 'is-walk-alight' : '',
                      isTransferAlight ? 'is-transfer-alight' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <StopNameDisplay
                      stop={matchedStopToDisplay(stop)}
                      className="transfer-plan-stop-name"
                    />
                    {isOrigin ? (
                      <span className="transfer-plan-stop-tag">{t('transferPlanOriginTag')}</span>
                    ) : null}
                    {isTransferAlight ? (
                      <span className="transfer-plan-stop-tag">{t('transferPlanTransferTag')}</span>
                    ) : null}
                    {isWalkAlight ? (
                      <span className="transfer-plan-stop-tag">{t('transferPlanWalkAlightTag')}</span>
                    ) : null}
                    {isBusDestination ? (
                      <span className="transfer-plan-stop-tag">{t('transferPlanDestinationTag')}</span>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}

      {plan.walkToDestination ? (
        <section className="transfer-plan-segment transfer-plan-walk">
          <p className="transfer-plan-walk-leg">
            {t('transferPlanWalkLeg', {
              minutes: plan.walkToDestination.minutes,
              from: stopLabel(plan.walkToDestination.from, locale),
              to: stopLabel(plan.walkToDestination.to, locale),
            })}
          </p>
          <p className="transfer-plan-stop transfer-plan-stop is-destination transfer-plan-walk-end">
            <StopNameDisplay
              stop={matchedStopToDisplay(plan.walkToDestination.to)}
              className="transfer-plan-stop-name"
            />
            <span className="transfer-plan-stop-tag">{t('transferPlanDestinationTag')}</span>
          </p>
        </section>
      ) : null}
    </div>
  )
}
