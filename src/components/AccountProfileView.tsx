import { useEffect, useState } from 'react'
import { changeAccountPassword, deleteAccount, fetchUserData } from '../api/userApi'
import { useAuth } from '../contexts/AuthContext'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useLocale } from '../i18n/LocaleContext'
import { getTabPageHref } from '../utils/appTabNavigation'

export function AccountProfileView() {
  const { t } = useLocale()
  const { alert, confirm } = useAppDialog()
  const { email, token, logout, mapAuthError } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [oauthOnly, setOauthOnly] = useState(false)

  useEffect(() => {
    if (!token) return
    void fetchUserData(token)
      .then((data) => setOauthOnly(Boolean(data.profile?.oauthOnly)))
      .catch(() => setOauthOnly(false))
  }, [token])

  const handleChangePassword = async () => {
    if (!token) return
    setBusy(true)
    try {
      await changeAccountPassword(token, currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      await alert({ message: t('authChangePasswordSuccess') })
    } catch (error) {
      await alert({ message: t(mapAuthError(error)) })
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!token) return
    const ok = await confirm({ message: t('authDeleteAccountConfirm') })
    if (!ok) return

    setBusy(true)
    try {
      await deleteAccount(token, oauthOnly ? undefined : deletePassword)
      logout()
      await alert({ message: t('authDeleteAccountSuccess') })
    } catch (error) {
      await alert({ message: t(mapAuthError(error)) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-profile-stack">
      <div className="account-profile-card">
        <div className="account-profile-avatar" aria-hidden>
          {(email?.[0] ?? '?').toUpperCase()}
        </div>
        <p className="account-profile-email">{email}</p>
        <p className="settings-hint">{t('authFavoritesSyncHint')}</p>
        <div className="settings-action-row">
          <a className="settings-action-btn" href={getTabPageHref('routes')}>
            {t('authBackToRoutes')}
          </a>
          <button type="button" className="settings-action-btn danger" onClick={logout}>
            {t('authLogout')}
          </button>
        </div>
      </div>

      <section className="account-profile-card">
        <h3 className="account-section-title">{t('authChangePasswordTitle')}</h3>
        {oauthOnly ? (
          <p className="settings-hint">{t('authErrorOAuthOnly')}</p>
        ) : (
          <>
            <label className="settings-field">
              <span className="settings-field-label">{t('authCurrentPassword')}</span>
              <input
                className="settings-input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="settings-field">
              <span className="settings-field-label">{t('authNewPassword')}</span>
              <input
                className="settings-input"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <div className="settings-action-row">
              <button
                type="button"
                className="settings-action-btn"
                disabled={busy || !currentPassword || !newPassword}
                onClick={() => void handleChangePassword()}
              >
                {t('authChangePasswordAction')}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="account-profile-card account-danger-zone">
        <h3 className="account-section-title">{t('authDeleteAccountTitle')}</h3>
        <p className="settings-hint">{t('authDeleteAccountHint')}</p>
        {!oauthOnly ? (
          <label className="settings-field">
            <span className="settings-field-label">{t('authCurrentPassword')}</span>
            <input
              className="settings-input"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          </label>
        ) : null}
        <div className="settings-action-row">
          <button
            type="button"
            className="settings-action-btn danger"
            disabled={busy || (!oauthOnly && !deletePassword)}
            onClick={() => void handleDeleteAccount()}
          >
            {t('authDeleteAccountAction')}
          </button>
        </div>
      </section>
    </div>
  )
}
