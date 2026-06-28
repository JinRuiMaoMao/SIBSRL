import { useCallback, useEffect, useId, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import {
  MAP_DRAW_COLOR_PRESETS,
  normalizeMapDrawColor,
  writeStoredMapDrawColor,
} from '../utils/mapDrawColor'

interface IslandMapDrawColorPickerProps {
  color: string
  onColorChange: (color: string) => void
}

export function IslandMapDrawColorPicker({ color, onColorChange }: IslandMapDrawColorPickerProps) {
  const { t } = useLocale()
  const inputId = useId()
  const [textValue, setTextValue] = useState(color.toUpperCase())

  useEffect(() => {
    setTextValue(color.toUpperCase())
  }, [color])

  const applyColor = useCallback(
    (next: string) => {
      const normalized = normalizeMapDrawColor(next)
      if (!normalized) return false
      onColorChange(normalized)
      writeStoredMapDrawColor(normalized)
      setTextValue(normalized.toUpperCase())
      return true
    },
    [onColorChange],
  )

  const commitTextValue = useCallback(() => {
    const normalized = normalizeMapDrawColor(textValue)
    if (!normalized) {
      setTextValue(color.toUpperCase())
      return
    }
    applyColor(normalized)
  }, [applyColor, color, textValue])

  return (
    <div className="island-map-draw-color">
      <span className="island-map-draw-color-label">{t('islandMapDrawColor')}</span>
      <div className="island-map-draw-color-row">
        <label className="island-map-draw-color-native" htmlFor={inputId} title={t('islandMapDrawColorPickHint')}>
          <input
            id={inputId}
            type="color"
            value={color}
            onChange={(event) => {
              applyColor(event.target.value)
            }}
          />
          <span className="island-map-draw-color-swatch" style={{ backgroundColor: color }} aria-hidden />
        </label>
        <div className="island-map-draw-color-presets" role="list" aria-label={t('islandMapDrawColorPresetsAria')}>
          {MAP_DRAW_COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              role="listitem"
              className={`island-map-draw-color-preset${preset === color ? ' island-map-draw-color-preset--active' : ''}`.trim()}
              style={{ backgroundColor: preset }}
              aria-label={preset}
              aria-pressed={preset === color}
              onClick={() => applyColor(preset)}
            />
          ))}
        </div>
      </div>
      <label className="island-map-draw-field island-map-draw-field--color">
        <span>{t('islandMapDrawColorInput')}</span>
        <input
          value={textValue}
          onChange={(event) => setTextValue(event.target.value)}
          onBlur={commitTextValue}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitTextValue()
            }
          }}
          placeholder="#5ec8ff / rgb(94, 200, 255)"
          spellCheck={false}
        />
      </label>
    </div>
  )
}
