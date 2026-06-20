import { useLocale } from '../i18n/LocaleContext'
import { formatTransferPlanRouteChain, type TransferPlan } from '../utils/stopTransferPlans'

interface TransferPlanListProps {
  plans: TransferPlan[]
  onSelectPlan: (plan: TransferPlan, planIndex: number) => void
}

export function TransferPlanList({ plans, onSelectPlan }: TransferPlanListProps) {
  const { t } = useLocale()

  return (
    <div className="transfer-plan-list">
      <p className="transfer-plan-heading">{t('transferPlanHeading')}</p>
      {plans.map((plan, planIndex) => {
        const routeChain = formatTransferPlanRouteChain(plan)

        return (
          <button
            key={planIndex}
            type="button"
            className="transfer-plan-card-link"
            onClick={() => onSelectPlan(plan, planIndex)}
          >
            <article className="transfer-plan-card">
              <div className="transfer-plan-card-top">
                <span className="transfer-plan-title">
                  {t('transferPlanTitle', {
                    index: planIndex + 1,
                    transfers: plan.transferCount,
                  })}
                </span>
                <span className="transfer-plan-card-hint">{t('transferPlanExpand')}</span>
              </div>
              <p className="transfer-plan-route-chain">{routeChain}</p>
            </article>
          </button>
        )
      })}
    </div>
  )
}
