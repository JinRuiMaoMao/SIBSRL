import { useLocale } from '../i18n/LocaleContext'
import {
  MAX_STOP_LABEL_SCALE,
  MIN_STOP_LABEL_SCALE,
  normalizeStopLabelScale,
  writeStoredMapDrawStopLabelScale,
  writeStoredMapDrawStopLabelVisible,
} from '../utils/mapDrawStopLabel'

interface IslandMapDrawStopLabelSettingsProps {
  visible: boolean
  scale: number
  onVisibleChange: (visible: boolean) => void
  onScaleChange: (scale: number) => void
}

export function IslandMapDrawStopLabelSettings({
  visible,
  scale,
  onVisibleChange,
  onScaleChange,
}: IslandMapDrawStopLabelSettingsProps) {
  const { t } = useLocale()
  const scalePercent = Math.round(normalizeStopLabelScale(scale) * 100)

  return (
    <div className="island-map-draw-stop-label-settings">
      <label className="island-map-draw-stop-label-check">
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => {
            const next = event.target.checked
            onVisibleChange(next)
            writeStoredMapDrawStopLabelVisible(next)
          }}
        />
        <span>{t('islandMapDrawStopLabelShow')}</span>
      </label>
      <label className="island-map-draw-field island-map-draw-field--stop-label-size">
        <span>{t('islandMapDrawStopLabelSize', { percent: scalePercent })}</span>
        <input
          type="range"
          min={Math.round(MIN_STOP_LABEL_SCALE * 100)}
          max={Math.round(MAX_STOP_LABEL_SCALE * 100)}
          step={5}
          value={scalePercent}
          disabled={!visible}
          onChange={(event) => {
            const next = normalizeStopLabelScale(Number(event.target.value) / 100)
            onScaleChange(next)
            writeStoredMapDrawStopLabelScale(next)
          }}
        />
      </label>
    </div>
  )
}
