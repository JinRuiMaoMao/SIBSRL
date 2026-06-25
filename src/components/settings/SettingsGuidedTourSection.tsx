import { beginGuidedTourReplayFromSettings } from '../../storage/guidedTourReplay'
import { useAppPreferences } from '../../contexts/AppPreferencesContext'
import { useGuidedTourControl } from '../../contexts/GuidedTourContext'
import { useLocale } from '../../i18n/LocaleContext'

export function SettingsGuidedTourSection() {
  const { t } = useLocale()
  const { guidedTourAutoStart, setGuidedTourAutoStart } = useAppPreferences()
  const { cancelAutoStartTimer, closeTour } = useGuidedTourControl()

  return (
    <div className="settings-page-fields">
      <div className="settings-field">
        <p className="settings-field-label">{t('guidedTourAutoStart')}</p>
        <div className="settings-toggle-group" role="group" aria-label={t('guidedTourAutoStart')}>
          <button
            type="button"
            className="settings-toggle-btn"
            aria-pressed={!guidedTourAutoStart}
            onClick={() => {
              setGuidedTourAutoStart(false)
              cancelAutoStartTimer()
              closeTour()
            }}
          >
            {t('settingOff')}
          </button>
          <button
            type="button"
            className="settings-toggle-btn"
            aria-pressed={guidedTourAutoStart}
            onClick={() => setGuidedTourAutoStart(true)}
          >
            {t('settingOn')}
          </button>
        </div>
        <p className="settings-hint">{t('guidedTourAutoStartHint')}</p>
      </div>
      <button
        type="button"
        className="settings-action-btn"
        onClick={() => beginGuidedTourReplayFromSettings()}
      >
        {t('guidedTourReplay')}
      </button>
      <p className="settings-hint">{t('guidedTourReplayHint')}</p>
    </div>
  )
}
