import { useCallback, useId, useState, type CSSProperties } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { PANEL_FILL_MAX, PANEL_FILL_MIN } from '../storage/appPreferences'

interface PanelFillSliderProps {
  value: number
  onChange: (value: number) => void
}

function panelFillRatio(value: number): number {
  return (value - PANEL_FILL_MIN) / (PANEL_FILL_MAX - PANEL_FILL_MIN)
}

export function PanelFillSlider({ value, onChange }: PanelFillSliderProps) {
  const { t } = useLocale()
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)
  const ratio = panelFillRatio(value)

  const endDrag = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div className="settings-panel-fill">
      <div className="settings-panel-fill-labels" aria-hidden>
        <span>{t('panelStyleGradient')}</span>
        <span>{t('panelStyleClassic')}</span>
      </div>
      <div
        className={`settings-panel-fill-track${isDragging ? ' is-dragging' : ''}`}
        style={{ '--panel-fill-ratio': ratio } as CSSProperties}
      >
        <output
          className="settings-panel-fill-value"
          htmlFor={inputId}
          aria-live="polite"
        >
          {value}%
        </output>
        <input
          id={inputId}
          className="settings-panel-fill-slider"
          type="range"
          min={PANEL_FILL_MIN}
          max={PANEL_FILL_MAX}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onBlur={endDrag}
          onKeyDown={() => setIsDragging(true)}
          onKeyUp={endDrag}
          aria-label={t('panelStyle')}
          aria-valuemin={PANEL_FILL_MIN}
          aria-valuemax={PANEL_FILL_MAX}
          aria-valuenow={value}
          aria-valuetext={`${value}%`}
        />
      </div>
    </div>
  )
}
