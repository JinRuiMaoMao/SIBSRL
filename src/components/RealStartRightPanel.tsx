import { useMemo, useState } from 'react'
import { useDailyChallenge } from '../hooks/useDailyChallenge'
import { resolveRealStartRightPanel } from '../utils/realStartRightPanel'
import { RealStartComingEventPanel } from './RealStartComingEventPanel'
import { RealStartDailyChallengePanel } from './RealStartDailyChallengePanel'
import { RealStartLatestUpdatePanel } from './RealStartLatestUpdatePanel'
import { UpcomingGameEventsDialog } from './UpcomingGameEventsDialog'

export function RealStartRightPanel({ onOpenChangeLog }: { onOpenChangeLog?: () => void }) {
  const dailyChallenge = useDailyChallenge()
  const panel = useMemo(
    () => resolveRealStartRightPanel(),
    [dailyChallenge.date, dailyChallenge.isAvailable],
  )
  const [eventsDialogOpen, setEventsDialogOpen] = useState(false)

  return (
    <>
      {panel.kind === 'coming-event' && panel.featuredEvent ? (
        <RealStartComingEventPanel
          event={panel.featuredEvent}
          onOpen={() => setEventsDialogOpen(true)}
        />
      ) : panel.kind === 'daily-challenge' ? (
        <RealStartDailyChallengePanel challenge={dailyChallenge} />
      ) : (
        <RealStartLatestUpdatePanel onOpenChangeLog={onOpenChangeLog} />
      )}

      <UpcomingGameEventsDialog
        open={eventsDialogOpen}
        onClose={() => setEventsDialogOpen(false)}
      />
    </>
  )
}
