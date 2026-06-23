import { useEffect, useState } from 'react'
import { fetchOAuthProviders, getOAuthStartUrl } from '../api/userApi'
import { useLocale } from '../i18n/LocaleContext'

export function OAuthSignInButtons() {
  const { t } = useLocale()
  const [providers, setProviders] = useState({ github: false, google: false })

  useEffect(() => {
    void fetchOAuthProviders()
      .then(setProviders)
      .catch(() => setProviders({ github: false, google: false }))
  }, [])

  if (!providers.github && !providers.google) return null

  return (
    <div className="oauth-signin-block">
      <p className="settings-hint">{t('authOAuthDivider')}</p>
      <div className="settings-action-row oauth-signin-actions">
        {providers.github ? (
          <button
            type="button"
            className="settings-action-btn oauth-btn"
            onClick={() => {
              const url = getOAuthStartUrl('github')
              if (url) window.location.href = url
            }}
          >
            {t('authOAuthGitHub')}
          </button>
        ) : null}
        {providers.google ? (
          <button
            type="button"
            className="settings-action-btn oauth-btn"
            onClick={() => {
              const url = getOAuthStartUrl('google')
              if (url) window.location.href = url
            }}
          >
            {t('authOAuthGoogle')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
