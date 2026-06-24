import { useLocale } from '../i18n/LocaleContext'
import {
  formatTransferPlanMetricItems,
  type TransferPlanMetrics,
} from '../utils/transferPlanMetrics'

interface TransferPlanMetricsSummaryProps {
  metrics: TransferPlanMetrics
  className?: string
}

export function TransferPlanMetricsSummary({
  metrics,
  className = '',
}: TransferPlanMetricsSummaryProps) {
  const { t } = useLocale()
  const items = formatTransferPlanMetricItems(metrics, t)

  return (
    <dl className={`transfer-plan-metrics-row ${className}`.trim()}>
      <div className="transfer-plan-metric">
        <dt className="transfer-plan-metric-label">{t('transferPlanMetricDistance')}</dt>
        <dd className="transfer-plan-metric-value">{items.distance}</dd>
      </div>
      <div className="transfer-plan-metric">
        <dt className="transfer-plan-metric-label">{t('transferPlanMetricTime')}</dt>
        <dd className="transfer-plan-metric-value">{items.time}</dd>
      </div>
      <div className="transfer-plan-metric">
        <dt className="transfer-plan-metric-label">{t('transferPlanMetricFare')}</dt>
        <dd className="transfer-plan-metric-value">{items.fare}</dd>
      </div>
      {items.estimatedSuffix ? (
        <div className="transfer-plan-metric transfer-plan-metric--note">
          <span className="transfer-plan-metric-estimated">{items.estimatedSuffix}</span>
        </div>
      ) : null}
    </dl>
  )
}
