import { useLocale } from '../i18n/LocaleContext'
import { useDailyChallengeResetCountdown } from '../hooks/useDailyChallengeResetCountdown'

export function DailyChallengeResetCountdown() {
  const { t } = useLocale()
  const countdown = useDailyChallengeResetCountdown()

  return (
    <div
      className="daily-challenge-reset-countdown"
      aria-live="polite"
      aria-label={t('dailyChallengeResetCountdownAria', { time: countdown })}
    >
      <span className="daily-challenge-reset-countdown-label">{t('dailyChallengeResetIn')}</span>
      <span className="daily-challenge-reset-countdown-time">{countdown}</span>
      <span className="daily-challenge-reset-countdown-hint">{t('dailyChallengeResetHint')}</span>
    </div>
  )
}
