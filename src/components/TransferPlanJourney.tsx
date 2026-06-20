import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { getStopsOnLeg, type TransferPlan } from '../utils/stopTransferPlans'

interface TransferPlanJourneyProps {
  plan: TransferPlan
  onOpenLeg?: (routeId: string, directionIndex: number) => void
}

function stopLabel(
  stop: { zh: string; en: string },
  locale: ReturnType<typeof useLocale>['locale'],
): string {
  return getPrimaryText({ zh: stop.zh, en: stop.en }, locale)
}

export function TransferPlanJourney({ plan, onOpenLeg }: TransferPlanJourneyProps) {
  const { locale, t } = useLocale()

  return (
    <div className="transfer-plan-journey">
      {plan.legs.map((leg, legIndex) => {
        const stops = getStopsOnLeg(leg)
        const directionLabel = getPrimaryText(
          leg.route.stops?.[leg.directionIndex]?.direction ?? { zh: '', en: '' },
          locale,
        )
        const displayStops = legIndex === 0 ? stops : stops.slice(1)

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
                const isDestination =
                  legIndex === plan.legs.length - 1 && stopIndex === displayStops.length - 1
                const isTransferAlight =
                  legIndex < plan.legs.length - 1 && stopIndex === displayStops.length - 1

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
                    <span className="transfer-plan-stop-name">{stopLabel(stop, locale)}</span>
                    {isOrigin ? (
                      <span className="transfer-plan-stop-tag">{t('transferPlanOriginTag')}</span>
                    ) : null}
                    {isTransferAlight ? (
                      <span className="transfer-plan-stop-tag">{t('transferPlanTransferTag')}</span>
                    ) : null}
                    {isDestination ? (
                      <span className="transfer-plan-stop-tag">{t('transferPlanDestinationTag')}</span>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
