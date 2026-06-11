import type { DailyChallengeIntro as DailyChallengeIntroContent } from '../data/dailyChallenge'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'

interface DailyChallengeIntroProps {
  intro: DailyChallengeIntroContent
  /** 卡片等紧凑场景只显示正文摘要 */
  compact?: boolean
  className?: string
}

export function DailyChallengeIntro({
  intro,
  compact = false,
  className = '',
}: DailyChallengeIntroProps) {
  const { locale } = useLocale()
  const body = getPrimaryText(intro.body, locale)

  if (compact) {
    return (
      <p className={`daily-challenge-intro daily-challenge-intro--compact ${className}`.trim()}>
        {body}
      </p>
    )
  }

  return (
    <section className={`daily-challenge-intro ${className}`.trim()}>
      <p>{body}</p>
      <p className="daily-challenge-intro-objective">
        {getPrimaryText(intro.objective, locale)}
      </p>
      <p className="daily-challenge-intro-closing">
        {getPrimaryText(intro.closing, locale)}
      </p>
    </section>
  )
}
