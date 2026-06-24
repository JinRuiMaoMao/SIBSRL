import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loginAccount,
  registerAccount,
  resetAccountPassword,
  sendVerificationCode,
  UserApiError,
} from '../api/userApi'
import { isUserApiConfigured } from '../api/userApiConfig'
import type { MessageKey } from '../i18n/messages'
import {
  clearAuthSession,
  readAuthEmail,
  readAuthToken,
  writeAuthSession,
} from '../storage/authToken'
import { normalizeAuthEmail } from '../utils/authEmail'

interface AuthContextValue {
  enabled: boolean
  token: string | null
  email: string | null
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, code: string) => Promise<void>
  resetPassword: (email: string, password: string, code: string) => Promise<void>
  sendCode: (email: string, purpose: 'register' | 'reset', locale?: string) => Promise<void>
  logout: () => void
  completeOAuthSession: (token: string, email: string) => void
  mapAuthError: (error: unknown) => MessageKey
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const enabled = isUserApiConfigured()
  const [token, setToken] = useState<string | null>(() => readAuthToken())
  const [email, setEmail] = useState<string | null>(() => readAuthEmail())

  const applySession = useCallback((nextToken: string, nextEmail: string) => {
    writeAuthSession(nextToken, nextEmail)
    setToken(nextToken)
    setEmail(nextEmail)
  }, [])

  const logout = useCallback(() => {
    clearAuthSession()
    setToken(null)
    setEmail(null)
  }, [])

  const completeOAuthSession = useCallback(
    (nextToken: string, nextEmail: string) => {
      applySession(nextToken, nextEmail)
    },
    [applySession],
  )

  const login = useCallback(
    async (loginEmail: string, password: string) => {
      const result = await loginAccount(normalizeAuthEmail(loginEmail), password)
      applySession(result.token, result.email)
    },
    [applySession],
  )

  const register = useCallback(
    async (registerEmail: string, password: string, code: string) => {
      const result = await registerAccount(normalizeAuthEmail(registerEmail), password, code)
      applySession(result.token, result.email)
    },
    [applySession],
  )

  const resetPassword = useCallback(async (resetEmail: string, password: string, code: string) => {
    await resetAccountPassword(normalizeAuthEmail(resetEmail), password, code)
  }, [])

  const sendCode = useCallback(async (targetEmail: string, purpose: 'register' | 'reset', locale?: string) => {
    await sendVerificationCode(normalizeAuthEmail(targetEmail), purpose, locale)
  }, [])

  const mapAuthError = useCallback((error: unknown): MessageKey => {
    if (!(error instanceof UserApiError)) return 'authErrorGeneric'
    switch (error.code) {
      case 'user_api_unconfigured':
        return 'authErrorUnavailable'
      case 'invalid_email':
        return 'authErrorInvalidEmail'
      case 'invalid_credentials':
        return 'authErrorInvalidCredentials'
      case 'email_taken':
        return 'authErrorEmailTaken'
      case 'email_not_found':
        return 'authErrorEmailNotFound'
      case 'invalid_code':
        return 'authErrorInvalidCode'
      case 'password_too_short':
        return 'authErrorPasswordTooShort'
      case 'password_needs_letter_and_digit':
        return 'authErrorPasswordWeak'
      case 'rate_limited':
        return 'authErrorRateLimited'
      case 'mail_failed':
        return 'authErrorMailFailed'
      case 'network_error':
        return 'authErrorNetwork'
      case 'timeout':
        return 'authErrorTimeout'
      case 'oauth_only_account':
        return 'authErrorOAuthOnly'
      case 'invalid_message':
        return 'feedbackSubmitFailed'
      case 'invalid_display_name':
        return 'authErrorInvalidDisplayName'
      case 'invalid_avatar':
        return 'authErrorInvalidAvatar'
      case 'avatar_too_large':
        return 'authErrorAvatarTooLarge'
      default:
        return 'authErrorGeneric'
    }
  }, [])

  const value = useMemo(
    () => ({
      enabled,
      token,
      email,
      isLoggedIn: Boolean(token),
      login,
      register,
      resetPassword,
      sendCode,
      logout,
      completeOAuthSession,
      mapAuthError,
    }),
    [enabled, token, email, login, register, resetPassword, sendCode, logout, completeOAuthSession, mapAuthError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
