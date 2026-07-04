import { useLocale } from '../i18n/LocaleContext'
import type { RouteDetailMapStop } from '../utils/routeDetailMapStops'
import { StopDetailPanel } from './StopDetailPanel'

interface IslandMapStopDetailPopoverProps {
  stop: RouteDetailMapStop
  currentRouteId: string
  onClose: () => void
}

export function IslandMapStopDetailPopover({
  stop,
  currentRouteId,
  onClose,
}: IslandMapStopDetailPopoverProps) {
  const { t } = useLocale()

  return (
    <div className="island-map-stop-popover" role="dialog" aria-label={t('islandMapStopPopoverAria')}>
      <StopDetailPanel stop={stop.stop} seq={stop.seq} currentRouteId={currentRouteId} onClose={onClose} />
    </div>
  )
}
