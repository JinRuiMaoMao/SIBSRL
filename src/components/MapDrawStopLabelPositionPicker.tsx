import { useLocale } from '../i18n/LocaleContext'
import type { RouteEditorLabelPosition } from '../routeEditor/types'
import {
  isActiveStopLabelPosition,
  MAP_DRAW_STOP_LABEL_POSITIONS,
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
            className={`map-draw-stop-label-position-btn${isActiveStopLabelPosition(value, position) ? ' map-draw-stop-label-position-btn--active' : ''}`.trim()}
            aria-pressed={isActiveStopLabelPosition(value, position)}
            onClick={() => onChange(position)}
          >
            {t(`mapDrawStopLabelPosition_${position}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
