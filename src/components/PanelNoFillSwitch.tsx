import { useLocale } from '../i18n/LocaleContext'

interface PanelNoFillSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function PanelNoFillSwitch({ checked, onChange }: PanelNoFillSwitchProps) {
  const { t } = useLocale()

  return (
    <div className="settings-panel-no-fill">
      <label className="settings-panel-switch">
        <span className="settings-panel-switch-label">{t('panelNoFill')}</span>
        <input
          type="checkbox"
          className="settings-panel-switch-input"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          role="switch"
          aria-checked={checked}
          aria-label={t('panelNoFill')}
        />
      </label>
      <p className="settings-hint">{t('panelNoFillHint')}</p>
    </div>
  )
}
