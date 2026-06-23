import { useState } from 'react'
import { getUserApiBaseUrl } from '../api/userApiConfig'
import { OAuthSignInButtons } from './OAuthSignInButtons'
import { useAuth } from '../contexts/AuthContext'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useLocale } from '../i18n/LocaleContext'
import { readLastAuthEmail } from '../storage/authToken'

export type AuthMode = 'login' | 'register' | 'reset'

interface AccountAuthFormProps {
  initialMode?: AuthMode
  onSuccess?: () => void
}

export function AccountAuthForm({ initialMode = 'login', onSuccess }: AccountAuthFormProps) {
  const { t } = useLocale()
  const { alert } = useAppDialog()
  const { login, register, resetPassword, sendCode, mapAuthError } = useAuth()

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState(() => readLastAuthEmail() ?? '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const showError = async (error: unknown) => {
    const message = t(mapAuthError(error))
    setStatusMessage(message)
    await alert({ message })
  }

  const handleSendCode = async () => {
    setBusy(true)
    setStatusMessage(t('authSendingCode'))
    try {
      const purpose = mode === 'reset' ? 'reset' : 'register'
      await sendCode(email, purpose)
      setCodeSent(true)
      setStatusMessage(t('authCodeSentInline'))
      await alert({ message: t('authCodeSent') })
    } catch (error) {
      await showError(error)
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async () => {
    setBusy(true)
    setStatusMessage(null)
    try {
      if (mode === 'login') {
        await login(email, password)
        await alert({ message: t('authLoginSuccess') })
        onSuccess?.()
      } else if (mode === 'register') {
        await register(email, password, code)
        await alert({ message: t('authRegisterSuccess') })
        onSuccess?.()
      } else {
        await resetPassword(email, password, code)
        await alert({ message: t('authResetSuccess') })
        setMode('login')
      }
      setPassword('')
      setCode('')
      setCodeSent(false)
    } catch (error) {
      await showError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-auth-card">
      <div className="settings-toggle-group auth-mode-toggle">
        <button
          type="button"
          className="settings-toggle-btn"
          aria-pressed={mode === 'login'}
          onClick={() => {
            setMode('login')
            setCodeSent(false)
          }}
        >
          {t('authLogin')}
        </button>
        <button
          type="button"
          className="settings-toggle-btn"
          aria-pressed={mode === 'register'}
          onClick={() => {
            setMode('register')
            setCodeSent(false)
          }}
        >
          {t('authRegister')}
        </button>
        <button
          type="button"
          className="settings-toggle-btn"
          aria-pressed={mode === 'reset'}
          onClick={() => {
            setMode('reset')
            setCodeSent(false)
          }}
        >
          {t('authResetPassword')}
        </button>
      </div>

      <p className="settings-hint">{t('authIntro')}</p>
      {getUserApiBaseUrl() ? (
        <p className="settings-hint account-api-hint">
          {t('authApiUrlHint', { url: getUserApiBaseUrl() ?? '' })}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="account-status-message" role="status">
          {statusMessage}
        </p>
      ) : null}

      <label className="settings-field">
        <span className="settings-field-label">{t('authEmail')}</span>
        <input
          className="settings-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="settings-field">
        <span className="settings-field-label">{t('authPassword')}</span>
        <input
          className="settings-input"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {mode !== 'login' ? (
        <>
          <label className="settings-field">
            <span className="settings-field-label">{t('authVerificationCode')}</span>
            <input
              className="settings-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <div className="settings-action-row">
            <button
              type="button"
              className="settings-action-btn"
              disabled={busy || !email.trim()}
              onClick={() => void handleSendCode()}
            >
              {busy
                ? t('authSendingCode')
                : codeSent
                  ? t('authResendCode')
                  : t('authSendCode')}
            </button>
          </div>
        </>
      ) : null}

      <div className="settings-action-row">
        <button
          type="button"
          className="settings-action-btn"
          disabled={busy || !email.trim() || !password}
          onClick={() => void handleSubmit()}
        >
          {mode === 'login'
            ? t('authLogin')
            : mode === 'register'
              ? t('authRegister')
              : t('authResetPassword')}
        </button>
      </div>

      {mode === 'login' ? <OAuthSignInButtons /> : null}
    </div>
  )
}
