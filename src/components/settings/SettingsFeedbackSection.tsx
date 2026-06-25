import { useState } from 'react'
import { RouteDataFeedbackDialog } from '../RouteDataFeedbackDialog'
import { useLocale } from '../../i18n/LocaleContext'

export function SettingsFeedbackSection() {
  const { t } = useLocale()
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <div className="settings-page-fields">
      <p className="settings-hint">{t('settingsFeedbackLead')}</p>
      <button type="button" className="settings-action-btn" onClick={() => setFeedbackOpen(true)}>
        {t('feedbackOpen')}
      </button>
      <RouteDataFeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
