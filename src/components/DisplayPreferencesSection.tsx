import { useLocale } from '../i18n/LocaleContext'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import type { ListDensity } from '../storage/appPreferences'

function SettingsToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="settings-toggle-group" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className="settings-toggle-btn"
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function DisplayPreferencesSection() {
  const { t } = useLocale()
  const { reduceMotion, listDensity, setReduceMotion, setListDensity } = useAppPreferences()

  const densityOptions: { id: ListDensity; label: string }[] = [
    { id: 'comfortable', label: t('listDensityComfortable') },
    { id: 'compact', label: t('listDensityCompact') },
  ]

  return (
    <section className="settings-section">
      <p className="settings-panel-title">{t('displayPreferences')}</p>

      <div className="settings-field">
        <p className="settings-field-label">{t('reduceMotion')}</p>
        <SettingsToggleGroup
          label={t('reduceMotion')}
          value={reduceMotion ? 'on' : 'off'}
          options={[
            { id: 'off', label: t('settingOff') },
            { id: 'on', label: t('settingOn') },
          ]}
          onChange={(next) => setReduceMotion(next === 'on')}
        />
      </div>

      <div className="settings-field">
        <p className="settings-field-label">{t('listDensity')}</p>
        <SettingsToggleGroup
          label={t('listDensity')}
          value={listDensity}
          options={densityOptions}
          onChange={setListDensity}
        />
      </div>
    </section>
  )
}
