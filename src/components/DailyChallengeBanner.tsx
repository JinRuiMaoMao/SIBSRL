import type { DailyChallengeInfo } from '../data/dailyChallenge'
import { DailyChallengeCard } from './DailyChallengeCard'

interface DailyChallengeBannerProps {
  selected: boolean
  onSelect: () => void
  onOpenCalendar?: () => void
  challenge: DailyChallengeInfo
}

export function DailyChallengeBanner({
  selected,
  onSelect,
  onOpenCalendar,
  challenge,
}: DailyChallengeBannerProps) {
  return (
    <DailyChallengeCard
      selected={selected}
      onSelect={onSelect}
      onOpenCalendar={onOpenCalendar}
      challenge={challenge}
    />
  )
}
