import { useLocale } from '../i18n/LocaleContext'
import { PANEL_FILL_MAX, PANEL_FILL_MIN } from '../storage/appPreferences'

interface PanelFillSliderProps {
  value: number
  onChange: (value: number) => void
}

export function PanelFillSlider({ value, onChange }: PanelFillSliderProps) {
  const { t } = useLocale()

  return (
    <div className="settings-panel-fill">
      <div className="settings-panel-fill-labels" aria-hidden>
        <span>{t('panelStyleGradient')}</span>
        <span>{t('panelStyleClassic')}</span>
      </div>
      <input
        className="settings-panel-fill-slider"
        type="range"
        min={PANEL_FILL_MIN}
        max={PANEL_FILL_MAX}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={t('panelStyle')}
        aria-valuemin={PANEL_FILL_MIN}
        aria-valuemax={PANEL_FILL_MAX}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
      />
    </div>
  )
}
