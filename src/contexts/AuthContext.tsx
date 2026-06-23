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
import {
  clearAuthSession,
  readAuthEmail,
  readAuthToken,
  writeAuthSession,
} from '../storage/authToken'

interface AuthContextValue {
  enabled: boolean
  token: string | null
  email: string | null
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, code: string) => Promise<void>
  resetPassword: (email: string, password: string, code: string) => Promise<void>
  sendCode: (email: string, purpose: 'register' | 'reset') => Promise<void>
  logout: () => void
  mapAuthError: (error: unknown) => string
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

  const login = useCallback(
    async (loginEmail: string, password: string) => {
      const result = await loginAccount(loginEmail, password)
      applySession(result.token, result.email)
    },
    [applySession],
  )

  const register = useCallback(
    async (registerEmail: string, password: string, code: string) => {
      const result = await registerAccount(registerEmail, password, code)
      applySession(result.token, result.email)
    },
    [applySession],
  )

  const resetPassword = useCallback(async (resetEmail: string, password: string, code: string) => {
    await resetAccountPassword(resetEmail, password, code)
  }, [])

  const sendCode = useCallback(async (targetEmail: string, purpose: 'register' | 'reset') => {
    await sendVerificationCode(targetEmail, purpose)
  }, [])

  const mapAuthError = useCallback((error: unknown) => {
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
      mapAuthError,
    }),
    [enabled, token, email, login, register, resetPassword, sendCode, logout, mapAuthError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
