import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useLocale } from '../i18n/LocaleContext'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [codeSent, setCodeSent] = useState(false)

  const showError = async (error: unknown) => {
    await alert({ message: t(mapAuthError(error)) })
  }

  const handleSendCode = async () => {
    setBusy(true)
    try {
      const purpose = mode === 'reset' ? 'reset' : 'register'
      await sendCode(email, purpose)
      setCodeSent(true)
      await alert({ message: t('authCodeSent') })
    } catch (error) {
      await showError(error)
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async () => {
    setBusy(true)
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
              {codeSent ? t('authResendCode') : t('authSendCode')}
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
    </div>
  )
}
