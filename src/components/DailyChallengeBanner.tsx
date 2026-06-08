import { DailyChallengeCard } from './DailyChallengeCard'

interface DailyChallengeBannerProps {
  selected: boolean
  onSelect: () => void
}

export function DailyChallengeBanner({ selected, onSelect }: DailyChallengeBannerProps) {
  return <DailyChallengeCard selected={selected} onSelect={onSelect} />
}
