import { useState } from 'react'
import { submitRouteFeedback } from '../api/userApi'
import { useAuth } from '../contexts/AuthContext'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useLocale } from '../i18n/LocaleContext'

const FEEDBACK_CATEGORIES = ['stops', 'fare', 'service', 'audio', 'other'] as const

interface RouteDataFeedbackDialogProps {
  open: boolean
  routeId?: string | null
  onClose: () => void
}

export function RouteDataFeedbackDialog({ open, routeId, onClose }: RouteDataFeedbackDialogProps) {
  const { t } = useLocale()
  const { alert } = useAppDialog()
  const { email } = useAuth()
  const [category, setCategory] = useState<(typeof FEEDBACK_CATEGORIES)[number]>('stops')
  const [message, setMessage] = useState('')
  const [contactEmail, setContactEmail] = useState(email ?? '')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    setBusy(true)
    try {
      await submitRouteFeedback({
        routeId: routeId ?? null,
        category,
        message: message.trim(),
        contactEmail: contactEmail.trim() || undefined,
      })
      await alert({ message: t('feedbackSubmitSuccess') })
      setMessage('')
      onClose()
    } catch {
      await alert({ message: t('feedbackSubmitFailed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-dialog-root">
      <button type="button" className="app-dialog-backdrop" aria-label={t('dialogCancel')} onClick={onClose} />
      <div
        className="app-dialog-panel route-feedback-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-feedback-title"
      >
        <h2 id="route-feedback-title" className="app-dialog-title">
          {t('feedbackTitle')}
        </h2>
        <p className="app-dialog-message">{t('feedbackLead')}</p>
        {routeId ? <p className="route-feedback-route">{t('feedbackRouteLabel', { route: routeId })}</p> : null}

        <label className="settings-field">
          <span className="settings-field-label">{t('feedbackCategory')}</span>
          <select
            className="settings-input"
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof FEEDBACK_CATEGORIES)[number])}
          >
            {FEEDBACK_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`feedbackCategory_${value}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field">
          <span className="settings-field-label">{t('feedbackMessage')}</span>
          <textarea
            className="settings-input route-feedback-message"
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>

        <label className="settings-field">
          <span className="settings-field-label">{t('feedbackContactEmail')}</span>
          <input
            className="settings-input"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder={t('feedbackContactOptional')}
          />
        </label>

        <div className="app-dialog-actions">
          <button type="button" className="app-dialog-btn" disabled={busy} onClick={onClose}>
            {t('dialogCancel')}
          </button>
          <button
            type="button"
            className="app-dialog-btn app-dialog-btn--primary"
            disabled={busy || message.trim().length < 8}
            onClick={() => void handleSubmit()}
          >
            {t('feedbackSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}
