import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useLocale } from '../i18n/LocaleContext'
import { getAccountPageHref } from '../utils/appPage'
import { REAL_PROFILE_GAME_TITLES } from '../data/realProfileTitles'
import { getPrimaryText } from '../i18n/displayText'
import { resolveAccountLicenseName } from '../utils/accountAvatar'

export function RealProfileTitleTab() {
  const { locale, t } = useLocale()
  const [equippedTitleId, setEquippedTitleId] = useState('driver')
  const { alert } = useAppDialog()
  const { isLoggedIn, token, email, mapAuthError } = useAuth()
  const { profile, saveProfile } = useUserProfile()
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const accountHref = getAccountPageHref()

  useEffect(() => {
    setDisplayNameDraft(profile?.displayName ?? '')
  }, [profile?.displayName])

  const profileDirty = displayNameDraft.trim() !== (profile?.displayName ?? '')
  const previewLabel = resolveAccountLicenseName(displayNameDraft.trim() || null, profile?.email ?? email)

  const handleSave = async () => {
    if (!token) return
    setBusy(true)
    try {
      await saveProfile({
        displayName: displayNameDraft.trim() || null,
        avatarDataUrl: profile?.avatarDataUrl ?? null,
      })
      await alert({ message: t('authProfileSaveSuccess') })
    } catch (error) {
      await alert({ message: t(mapAuthError(error)) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="real-profile-title-tab">
      {!isLoggedIn ? (
        <>
          <p className="real-profile-title-tab-lead">{t('authProfileLeadSignedOut')}</p>
          <a className="real-profile-icon-link" href={accountHref}>
            {t('realProfileSignInLink')}
          </a>
        </>
      ) : (
      <article className="real-profile-title-note">
        <h3 className="real-profile-title-note-heading">{t('authProfileCustomizeTitle')}</h3>
        <p className="real-profile-title-note-hint">{t('authDisplayNameHint')}</p>
        <label className="real-profile-title-field">
          <span className="real-profile-title-field-label">{t('authDisplayNameLabel')}</span>
          <input
            className="real-profile-title-input"
            type="text"
            maxLength={32}
            autoComplete="nickname"
            value={displayNameDraft}
            onChange={(event) => setDisplayNameDraft(event.target.value)}
          />
        </label>
        <p className="real-profile-title-preview">
          <span className="real-profile-title-preview-label">{t('realProfileLicenseName')}</span>
          <span className="real-profile-title-preview-value">{previewLabel}</span>
        </p>
        <button
          type="button"
          className="real-profile-title-save"
          disabled={busy || !profileDirty}
          onClick={() => void handleSave()}
        >
          {t('authProfileSave')}
        </button>
      </article>
      )}

      <section className="real-profile-title-catalog" aria-label={t('realProfileTitlesCatalog')}>
        <h3 className="real-profile-title-catalog-heading">{t('realProfileTitlesCatalog')}</h3>
        <ul className="real-profile-title-catalog-list sibs-scrollbar">
          {REAL_PROFILE_GAME_TITLES.map((title) => {
            const active = equippedTitleId === title.id
            return (
              <li key={title.id}>
                <button
                  type="button"
                  className={`real-profile-title-catalog-item${active ? ' real-profile-title-catalog-item--active' : ''}${title.vip ? ' real-profile-title-catalog-item--vip' : ''}`}
                  aria-pressed={active}
                  onClick={() => setEquippedTitleId(title.id)}
                >
                  <span>{getPrimaryText(title.label, locale)}</span>
                  {title.vip ? <span className="real-profile-title-catalog-badge">VIP</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="real-profile-title-catalog-note">{t('realProfileTitlesDemoNote')}</p>
      </section>
    </div>
  )
}
