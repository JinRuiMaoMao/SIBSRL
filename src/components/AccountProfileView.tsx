import { useEffect, useId, useRef, useState } from 'react'
import { changeAccountPassword, deleteAccount } from '../api/userApi'
import { useAuth } from '../contexts/AuthContext'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useLocale } from '../i18n/LocaleContext'
import { readAvatarFileAsDataUrl } from '../utils/avatarImage'
import { getTabPageHref } from '../utils/appTabNavigation'
import { AccountAvatar } from './AccountAvatar'

export function AccountProfileView() {
  const { t } = useLocale()
  const { alert, confirm } = useAppDialog()
  const { email, token, logout, mapAuthError } = useAuth()
  const { profile, saveProfile } = useUserProfile()
  const avatarInputId = useId()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [busy, setBusy] = useState(false)
  const oauthOnly = Boolean(profile?.oauthOnly)

  useEffect(() => {
    setDisplayNameDraft(profile?.displayName ?? '')
    setAvatarDraft(profile?.avatarDataUrl ?? null)
  }, [profile])

  const handleSaveProfile = async () => {
    if (!token) return
    setBusy(true)
    try {
      await saveProfile({
        displayName: displayNameDraft.trim() || null,
        avatarDataUrl: avatarDraft,
      })
      await alert({ message: t('authProfileSaveSuccess') })
    } catch (error) {
      await alert({ message: t(mapAuthError(error)) })
    } finally {
      setBusy(false)
    }
  }

  const handleAvatarPick = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await readAvatarFileAsDataUrl(file)
      setAvatarDraft(dataUrl)
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'avatar_too_large'
          ? t('authErrorAvatarTooLarge')
          : t('authErrorInvalidAvatar')
      await alert({ message })
    } finally {
      setBusy(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

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

  const profileDirty =
    displayNameDraft.trim() !== (profile?.displayName ?? '') ||
    avatarDraft !== (profile?.avatarDataUrl ?? null)

  return (
    <div className="account-profile-stack">
      <div className="account-profile-card">
        <AccountAvatar
          displayName={displayNameDraft || profile?.displayName}
          email={profile?.email ?? email}
          avatarDataUrl={avatarDraft}
          size="profile"
        />
        <p className="account-profile-email">{profile?.email ?? email}</p>
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
        <h3 className="account-section-title">{t('authProfileCustomizeTitle')}</h3>
        <p className="settings-hint">{t('authDisplayNameHint')}</p>
        <label className="settings-field">
          <span className="settings-field-label">{t('authDisplayNameLabel')}</span>
          <input
            className="settings-input"
            type="text"
            maxLength={32}
            autoComplete="nickname"
            value={displayNameDraft}
            onChange={(event) => setDisplayNameDraft(event.target.value)}
          />
        </label>
        <div className="account-profile-avatar-actions">
          <label className="settings-action-btn" htmlFor={avatarInputId}>
            {t('authAvatarUploadLabel')}
          </label>
          <input
            ref={avatarInputRef}
            id={avatarInputId}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => void handleAvatarPick(event.target.files?.[0] ?? null)}
          />
          {avatarDraft ? (
            <button
              type="button"
              className="settings-action-btn"
              disabled={busy}
              onClick={() => setAvatarDraft(null)}
            >
              {t('authAvatarRemove')}
            </button>
          ) : null}
        </div>
        <div className="settings-action-row">
          <button
            type="button"
            className="settings-action-btn"
            disabled={busy || !profileDirty}
            onClick={() => void handleSaveProfile()}
          >
            {t('authProfileSave')}
          </button>
        </div>
      </section>

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
