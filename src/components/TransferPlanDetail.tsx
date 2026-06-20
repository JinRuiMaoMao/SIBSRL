import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { MatchedStop } from '../utils/routeStopLookup'
import { formatTransferPlanRouteChain, type TransferPlan } from '../utils/stopTransferPlans'
import { TransferPlanJourney } from './TransferPlanJourney'
import {
  estimateTransferPlanMetrics,
  formatTransferPlanMetrics,
} from '../utils/transferPlanMetrics'

interface TransferPlanDetailProps {
  plan: TransferPlan
  planIndex: number
  from: MatchedStop
  to: MatchedStop
  onClose: () => void
  onOpenLeg: (routeId: string, directionIndex: number) => void
  className?: string
}

export function TransferPlanDetail({
  plan,
  planIndex,
  from,
  to,
  onClose,
  onOpenLeg,
  className = '',
}: TransferPlanDetailProps) {
  const { locale, t } = useLocale()
  const routeChain = formatTransferPlanRouteChain(plan)
  const fromLabel = getPrimaryText({ zh: from.zh, en: from.en }, locale)
  const toLabel = getPrimaryText({ zh: to.zh, en: to.en }, locale)
  const metrics = estimateTransferPlanMetrics(plan, locale)

  return (
    <aside
      className={`route-detail transfer-plan-detail ${className}`.trim()}
      aria-label={t('transferPlanDetailAria', { routes: routeChain })}
    >
      <div className="detail-header">
        <div className="detail-header-title">
          <span className="detail-number">
            {t('transferPlanTitle', {
              index: planIndex + 1,
              transfers: plan.transferCount,
            })}
          </span>
          <span className="zone-tag">{routeChain}</span>
        </div>
        <button type="button" className="close-btn" onClick={onClose} aria-label={t('closeDetail')}>
          ×
        </button>
      </div>

      <p className="transfer-plan-detail-summary">
        {t('betweenStopsSummary', { from: fromLabel, to: toLabel })}
      </p>

      <p className="transfer-plan-metrics transfer-plan-metrics--detail">
        {formatTransferPlanMetrics(metrics, t)}
      </p>
      <p className="transfer-plan-metrics-note">{t('transferPlanMetricsNote')}</p>

      <p className="transfer-plan-timetable-note">{t('transferPlanTimetableNote')}</p>

      <TransferPlanJourney plan={plan} onOpenLeg={onOpenLeg} />
    </aside>
  )
}
