import type { DailyChallengeInfo } from '../data/dailyChallenge'
import { DailyChallengeCard } from './DailyChallengeCard'

interface DailyChallengeBannerProps {
  selected: boolean
  onSelect: () => void
  challenge: DailyChallengeInfo
}

export function DailyChallengeBanner({ selected, onSelect, challenge }: DailyChallengeBannerProps) {
  return <DailyChallengeCard selected={selected} onSelect={onSelect} challenge={challenge} />
}
