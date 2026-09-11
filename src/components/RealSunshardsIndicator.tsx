import { useLocale } from '../i18n/LocaleContext'
import { useRealSunshardsBalance } from '../hooks/useRealSunshardsBalance'
import { SunshardIcon } from './SunshardIcon'

export function RealSunshardsIndicator({ className }: { className?: string }) {
  const { t } = useLocale()
  const balance = useRealSunshardsBalance()

  return (
    <div
      className={`real-sunshards-indicator${className ? ` ${className}` : ''}`}
      aria-label={t('realSunshardsBalanceAria', { count: balance })}
    >
      <SunshardIcon className="real-sunshards-indicator-icon" size={20} />
      <span className="real-sunshards-indicator-count">{balance.toLocaleString()}</span>
    </div>
  )
}
