import { useLocale } from '../i18n/LocaleContext'
import { formatTransferPlanRouteChain, type TransferPlan } from '../utils/stopTransferPlans'
import { estimateTransferPlanMetrics } from '../utils/transferPlanMetrics'
import { TransferPlanMetricsSummary } from './TransferPlanMetricsSummary'

interface TransferPlanListProps {
  plans: TransferPlan[]
  onSelectPlan: (plan: TransferPlan, planIndex: number) => void
}

export function TransferPlanList({ plans, onSelectPlan }: TransferPlanListProps) {
  const { locale, t } = useLocale()

  return (
    <div className="transfer-plan-list">
      <p className="transfer-plan-heading">{t('transferPlanHeading')}</p>
      {plans.map((plan, planIndex) => {
        const routeChain = formatTransferPlanRouteChain(plan)
        const chainLabel = plan.walkToDestination
          ? `${routeChain} → ${t('transferPlanWalkShort')}`
          : routeChain
        const metrics = estimateTransferPlanMetrics(plan, locale)

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
                  {plan.walkToDestination
                    ? t('transferPlanTitleWithWalk', { index: planIndex + 1 })
                    : t('transferPlanTitle', {
                        index: planIndex + 1,
                        transfers: plan.transferCount,
                      })}
                </span>
                <span className="transfer-plan-card-hint">{t('transferPlanExpand')}</span>
              </div>
              <p className="transfer-plan-route-chain">{chainLabel}</p>
              <TransferPlanMetricsSummary metrics={metrics} />
            </article>
          </button>
        )
      })}
    </div>
  )
}
