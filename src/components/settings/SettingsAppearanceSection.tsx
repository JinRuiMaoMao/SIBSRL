import { PanelFillSlider } from '../PanelFillSlider'
import { PanelNoFillSwitch } from '../PanelNoFillSwitch'
import { ThemeToggle } from '../ThemeToggle'
import { useAppPreferences } from '../../contexts/AppPreferencesContext'
import { useLocale } from '../../i18n/LocaleContext'

export function SettingsAppearanceSection() {
  const { t } = useLocale()
  const { panelFill, setPanelFill, panelNoFill, setPanelNoFill } = useAppPreferences()

  return (
    <div className="settings-page-fields">
      <div className="settings-field">
        <p className="settings-field-label">{t('themeLabel')}</p>
        <ThemeToggle className="settings-theme-toggle" />
      </div>
      <div className="settings-field">
        <p className="settings-field-label">{t('panelStyle')}</p>
        {!panelNoFill ? (
          <>
            <PanelFillSlider value={panelFill} onChange={setPanelFill} />
            <p className="settings-hint">{t('panelStyleHint')}</p>
          </>
        ) : null}
        <PanelNoFillSwitch checked={panelNoFill} onChange={setPanelNoFill} />
      </div>
    </div>
  )
}
