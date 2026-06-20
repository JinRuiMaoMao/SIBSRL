import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { TransferPlan } from '../utils/stopTransferPlans'

interface TransferPlanListProps {
  plans: TransferPlan[]
  onOpenLeg: (routeId: string, directionIndex: number) => void
}

export function TransferPlanList({ plans, onOpenLeg }: TransferPlanListProps) {
  const { locale, t } = useLocale()

  return (
    <div className="transfer-plan-list">
      <p className="transfer-plan-heading">{t('transferPlanHeading')}</p>
      {plans.map((plan, planIndex) => (
        <article key={planIndex} className="transfer-plan-card">
          <h4 className="transfer-plan-title">
            {t('transferPlanTitle', {
              index: planIndex + 1,
              transfers: plan.transferCount,
            })}
          </h4>
          <ol className="transfer-plan-legs">
            {plan.legs.map((leg, legIndex) => {
              const fromLabel = getPrimaryText({ zh: leg.from.zh, en: leg.from.en }, locale)
              const toLabel = getPrimaryText({ zh: leg.to.zh, en: leg.to.en }, locale)
              const transferStop =
                legIndex > 0
                  ? getPrimaryText({ zh: leg.from.zh, en: leg.from.en }, locale)
                  : null

              return (
                <li key={`${planIndex}-${legIndex}-${leg.route.id}`} className="transfer-plan-leg">
                  {transferStop ? (
                    <p className="transfer-plan-change">
                      {t('transferPlanTransferAt', { stop: transferStop })}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="transfer-plan-leg-button"
                    onClick={() => onOpenLeg(leg.route.id, leg.directionIndex)}
                  >
                    {t('transferPlanLeg', {
                      route: leg.route.number,
                      from: fromLabel,
                      to: toLabel,
                    })}
                  </button>
                </li>
              )
            })}
          </ol>
        </article>
      ))}
    </div>
  )
}
