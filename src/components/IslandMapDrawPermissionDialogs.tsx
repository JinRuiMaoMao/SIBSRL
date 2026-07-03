import { useLocale } from '../i18n/LocaleContext'

interface IslandMapDrawPermissionDialogsProps {
  open: boolean
  onCancel: () => void
  onGoRegister: () => void
}

export function IslandMapDrawPermissionDialogs({
  open,
  onCancel,
  onGoRegister,
}: IslandMapDrawPermissionDialogsProps) {
  const { t } = useLocale()

  if (!open) return null

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
