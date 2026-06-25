import { useCallback, useEffect, useState } from 'react'
import { DisplayPreferencesSection } from './DisplayPreferencesSection'
import { ResetSettingsSection } from './ResetSettingsSection'
import { SettingsAppearanceSection } from './settings/SettingsAppearanceSection'
import {
  readSettingsCategoryFromLocation,
  SETTINGS_CATEGORIES,
  SETTINGS_CATEGORY_MESSAGE_KEYS,
  type SettingsCategory,
} from './settings/settingsCategories'
import { SettingsFeedbackSection } from './settings/SettingsFeedbackSection'
import { SettingsGuidedTourSection } from './settings/SettingsGuidedTourSection'
import { SettingsLanguageSection } from './settings/SettingsLanguageSection'
import { useLocale } from '../i18n/LocaleContext'

function renderCategoryPanel(category: SettingsCategory) {
  switch (category) {
    case 'appearance':
      return <SettingsAppearanceSection />
    case 'language':
      return <SettingsLanguageSection />
    case 'display':
      return <DisplayPreferencesSection layout="page" />
    case 'guidedTour':
      return <SettingsGuidedTourSection />
    case 'feedback':
      return <SettingsFeedbackSection />
    case 'reset':
      return <ResetSettingsSection layout="page" />
    default:
      return null
  }
}

export function SettingsPage() {
  const { t } = useLocale()
  const [category, setCategory] = useState<SettingsCategory>(readSettingsCategoryFromLocation)

  const selectCategory = useCallback((next: SettingsCategory) => {
    setCategory(next)
    const url = new URL(window.location.href)
    url.hash = next
    url.searchParams.delete('cat')
    window.history.replaceState(null, '', url.toString())
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      setCategory(readSettingsCategoryFromLocation())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const panelTitle = t(SETTINGS_CATEGORY_MESSAGE_KEYS[category])

  return (
    <section className="settings-page" aria-labelledby="settings-page-title">
      <header className="settings-page-header">
        <h2 id="settings-page-title">{t('settings')}</h2>
        <p className="settings-page-lead">{t('settingsPageLead')}</p>
      </header>

      <div className="settings-page-body">
        <nav className="settings-page-nav sibs-scrollbar" aria-label={t('settings')}>
          {SETTINGS_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              className={`settings-page-nav-item ${category === item ? 'active' : ''}`}
              aria-current={category === item ? 'page' : undefined}
              onClick={() => selectCategory(item)}
            >
              {t(SETTINGS_CATEGORY_MESSAGE_KEYS[item])}
            </button>
          ))}
        </nav>

        <article className="settings-page-panel sibs-scrollbar" aria-labelledby="settings-panel-title">
          <h3 id="settings-panel-title" className="settings-page-panel-title">
            {panelTitle}
          </h3>
          {renderCategoryPanel(category)}
        </article>
      </div>
    </section>
  )
}
