import { useLocale } from '../i18n/LocaleContext'

export type IslandMapDrawPermissionDialogStep = 'register' | 'confirm' | 'sent'

interface IslandMapDrawPermissionDialogsProps {
  step: IslandMapDrawPermissionDialogStep | null
  applicantEmail?: string | null
  sending?: boolean
  onCancel: () => void
  onConfirmSend: () => void
  onGoRegister: () => void
}

export function IslandMapDrawPermissionDialogs({
  step,
  applicantEmail,
  sending = false,
  onCancel,
  onConfirmSend,
  onGoRegister,
}: IslandMapDrawPermissionDialogsProps) {
  const { t } = useLocale()

  if (!step) return null

  if (step === 'register') {
    return (
      <div className="app-dialog-root island-map-permission-dialog-root">
        <button type="button" className="app-dialog-backdrop" aria-hidden onClick={onCancel} />
        <div
          className="app-dialog-panel island-map-permission-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="island-map-permission-register-title"
        >
          <h2 id="island-map-permission-register-title" className="app-dialog-title">
            {t('islandMapDrawPermissionRegisterTitle')}
          </h2>
          <p className="app-dialog-message">{t('islandMapDrawPermissionRegisterLead')}</p>
          <div className="app-dialog-actions">
            <button type="button" className="app-dialog-btn" onClick={onCancel}>
              {t('islandMapDrawExportCancel')}
            </button>
            <button type="button" className="app-dialog-btn app-dialog-btn--primary" onClick={onGoRegister}>
              {t('islandMapDrawPermissionGoRegister')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'sent') {
    return (
      <div className="app-dialog-root island-map-permission-dialog-root">
        <button type="button" className="app-dialog-backdrop" aria-hidden onClick={onCancel} />
        <div
          className="app-dialog-panel island-map-permission-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="island-map-permission-sent-title"
        >
          <h2 id="island-map-permission-sent-title" className="app-dialog-title">
            {t('islandMapDrawPermissionSentTitle')}
          </h2>
          <p className="app-dialog-message">{t('islandMapDrawPermissionSentLead')}</p>
          <div className="app-dialog-actions">
            <button type="button" className="app-dialog-btn app-dialog-btn--primary" onClick={onCancel}>
              {t('islandMapDrawPermissionSentOk')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-dialog-root island-map-permission-dialog-root">
      <button type="button" className="app-dialog-backdrop" aria-hidden onClick={onCancel} />
      <div
        className="app-dialog-panel island-map-permission-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="island-map-permission-confirm-title"
      >
        <h2 id="island-map-permission-confirm-title" className="app-dialog-title">
          {t('islandMapDrawPermissionConfirmTitle')}
        </h2>
        <p className="app-dialog-message">{t('islandMapDrawPermissionConfirmLead')}</p>
        {applicantEmail ? (
          <p className="island-map-permission-dialog-email">{applicantEmail}</p>
        ) : null}
        <div className="app-dialog-actions">
          <button type="button" className="app-dialog-btn" onClick={onCancel} disabled={sending}>
            {t('islandMapDrawPermissionConfirmNo')}
          </button>
          <button
            type="button"
            className="app-dialog-btn app-dialog-btn--primary"
            onClick={onConfirmSend}
            disabled={sending}
          >
            {sending ? t('islandMapDrawPermissionSending') : t('islandMapDrawPermissionConfirmYes')}
          </button>
        </div>
      </div>
    </div>
  )
}
