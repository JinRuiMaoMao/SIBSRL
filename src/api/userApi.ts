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
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const base = getUserApiBaseUrl()
  if (base === null) {
    throw new UserApiError('user_api_unconfigured', 'User API is not configured')
  }

  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
  })

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

export async function fetchUserData(token: string) {
  return request<{
    favorites: import('../storage/favoriteFolders').FavoriteFoldersState | null
    updatedAt: number | null
    favoriteCount: number
  }>('/api/user/data', { token })
}

export async function saveUserData(
  token: string,
  favorites: import('../storage/favoriteFolders').FavoriteFoldersState,
) {
  return request<{ updatedAt: number }>('/api/user/data', {
    method: 'PUT',
    token,
    body: JSON.stringify({ favorites }),
  })
}
