import { useLocale } from '../i18n/LocaleContext'
import type { RouteEditorLabelPosition } from '../routeEditor/types'
import {
  MAP_DRAW_STOP_LABEL_POSITIONS,
  normalizeRouteEditorLabelPosition,
} from '../utils/routeEditorStopLabel'

interface MapDrawStopLabelPositionPickerProps {
  value: RouteEditorLabelPosition
  onChange: (value: RouteEditorLabelPosition) => void
}

export function MapDrawStopLabelPositionPicker({
  value,
  onChange,
}: MapDrawStopLabelPositionPickerProps) {
  const { t } = useLocale()
  const active = normalizeRouteEditorLabelPosition(value)

  return (
    <div className="map-draw-stop-label-position-picker">
      <span className="map-draw-stop-label-position-picker-title">
        {t('mapDrawStopLabelPositionTitle')}
      </span>
      <div
        className="map-draw-stop-label-position-grid"
        role="group"
        aria-label={t('mapDrawStopLabelPositionTitle')}
      >
        {MAP_DRAW_STOP_LABEL_POSITIONS.map((position) => (
          <button
            key={position}
            type="button"
            className={`map-draw-stop-label-position-btn${active === position ? ' map-draw-stop-label-position-btn--active' : ''}`.trim()}
            aria-pressed={active === position}
            onClick={() => onChange(position)}
          >
            {t(`mapDrawStopLabelPosition_${position}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
