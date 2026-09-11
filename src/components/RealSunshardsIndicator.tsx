import { useLocale } from '../i18n/LocaleContext'
import { useRealSunshardsBalance } from '../hooks/useRealSunshardsBalance'

export function RealSunshardsIndicator({ className }: { className?: string }) {
  const { t } = useLocale()
  const balance = useRealSunshardsBalance()

  return (
    <div
      className={`real-sunshards-indicator${className ? ` ${className}` : ''}`}
      aria-label={t('realSunshardsBalanceAria', { count: balance })}
    >
      <span className="real-sunshards-indicator-icon" aria-hidden="true">
        ☀
      </span>
      <span className="real-sunshards-indicator-count">{balance.toLocaleString()}</span>
    </div>
  )
}
