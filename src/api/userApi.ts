import { getUserApiBaseUrl } from './userApiConfig'

export class UserApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null; signal?: AbortSignal } = {},
): Promise<T> {
  const base = getUserApiBaseUrl()
  if (base === null) {
    throw new UserApiError('user_api_unconfigured', 'User API is not configured')
  }

  const { token, signal: userSignal, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers)
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let res: Response
  try {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 120_000)
    const onUserAbort = () => controller.abort()
    userSignal?.addEventListener('abort', onUserAbort)
    try {
      res = await fetch(`${base}${path}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      })
    } finally {
      userSignal?.removeEventListener('abort', onUserAbort)
      window.clearTimeout(timeoutId)
    }
  } catch (error) {
    if (userSignal?.aborted) {
      throw new UserApiError('aborted', 'Request was cancelled')
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new UserApiError('timeout', 'Account service request timed out')
    }
    throw new UserApiError('network_error', 'Could not reach account service')
  }

  const payload = (await parseJson(res)) as { error?: string; message?: string } | null
  if (!res.ok) {
    throw new UserApiError(
      payload?.error ?? 'request_failed',
      payload?.message ?? `Request failed (${res.status})`,
    )
  }
  return payload as T
}

export async function sendVerificationCode(email: string, purpose: 'register' | 'reset') {
  return request<{ ok: true }>('/api/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ email, purpose }),
  })
}

export async function registerAccount(email: string, password: string, code: string) {
  return request<{ token: string; email: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, code }),
  })
}

export async function loginAccount(email: string, password: string) {
  return request<{ token: string; email: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function resetAccountPassword(email: string, password: string, code: string) {
  return request<{ ok: true }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, password, code }),
  })
}

export async function fetchUserData(token: string, signal?: AbortSignal) {
  return request<{
    favorites: import('../storage/favoriteFolders').FavoriteFoldersState | null
    updatedAt: number | null
    favoriteCount: number
    profile?: { email: string; oauthOnly: boolean }
  }>('/api/user/data', { token, signal })
}

export async function saveUserData(
  token: string,
  favorites: import('../storage/favoriteFolders').FavoriteFoldersState,
  signal?: AbortSignal,
) {
  return request<{ updatedAt: number }>('/api/user/data', {
    method: 'PUT',
    token,
    body: JSON.stringify({ favorites }),
    signal,
  })
}

export async function changeAccountPassword(
  token: string,
  currentPassword: string,
  newPassword: string,
) {
  return request<{ ok: true }>('/api/auth/change-password', {
    method: 'POST',
    token,
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function deleteAccount(token: string, currentPassword?: string) {
  return request<{ ok: true }>('/api/user/account', {
    method: 'DELETE',
    token,
    body: JSON.stringify({ currentPassword: currentPassword ?? '' }),
  })
}

export async function submitRouteFeedback(payload: {
  routeId?: string | null
  category: string
  message: string
  contactEmail?: string
}) {
  return request<{ ok: true }>('/api/feedback/route', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchOAuthProviders() {
  return request<{ github: boolean; google: boolean }>('/api/auth/oauth/providers')
}

export function getOAuthStartUrl(provider: 'github' | 'google'): string | null {
  const base = getUserApiBaseUrl()
  if (!base) return null
  return `${base}/api/auth/oauth/${provider}/start`
}
