import { createHash, randomBytes } from 'node:crypto'

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
/** @type {Map<string, { provider: string, createdAt: number }>} */
const pendingStates = new Map()

function pruneStates() {
  const now = Date.now()
  for (const [state, entry] of pendingStates) {
    if (now - entry.createdAt > OAUTH_STATE_TTL_MS) pendingStates.delete(state)
  }
}

export function createOAuthState(provider) {
  pruneStates()
  const state = randomBytes(16).toString('hex')
  pendingStates.set(state, { provider, createdAt: Date.now() })
  return state
}

export function consumeOAuthState(state, provider) {
  pruneStates()
  const entry = pendingStates.get(state)
  if (!entry || entry.provider !== provider) return false
  pendingStates.delete(state)
  return Date.now() - entry.createdAt <= OAUTH_STATE_TTL_MS
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function optionalEnv(name) {
  return process.env[name]?.trim() || null
}

export function getOAuthFrontendRedirectUrl() {
  return (
    optionalEnv('OAUTH_FRONTEND_URL') ||
    optionalEnv('USER_API_CORS_ORIGIN')?.split(',')[0]?.trim() ||
    'https://jinruimaomao.github.io/SIBSRL/account.html'
  )
}

export function getApiPublicBaseUrl(req) {
  const configured = optionalEnv('OAUTH_API_BASE_URL')
  if (configured) return configured.replace(/\/$/, '')

  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:8788'
  const proto = req.headers['x-forwarded-proto'] ?? 'http'
  return `${proto}://${host}`.replace(/\/$/, '')
}

export function isGitHubOAuthConfigured() {
  return Boolean(optionalEnv('GITHUB_CLIENT_ID') && optionalEnv('GITHUB_CLIENT_SECRET'))
}

export function isGoogleOAuthConfigured() {
  return Boolean(optionalEnv('GOOGLE_CLIENT_ID') && optionalEnv('GOOGLE_CLIENT_SECRET'))
}

export function buildGitHubAuthorizeUrl(req) {
  const clientId = requireEnv('GITHUB_CLIENT_ID')
  const redirectUri = `${getApiPublicBaseUrl(req)}/api/auth/oauth/github/callback`
  const state = createOAuthState('github')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export function buildGoogleAuthorizeUrl(req) {
  const clientId = requireEnv('GOOGLE_CLIENT_ID')
  const redirectUri = `${getApiPublicBaseUrl(req)}/api/auth/oauth/google/callback`
  const state = createOAuthState('google')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function exchangeGitHubCode(req, code) {
  const clientId = requireEnv('GITHUB_CLIENT_ID')
  const clientSecret = requireEnv('GITHUB_CLIENT_SECRET')
  const redirectUri = `${getApiPublicBaseUrl(req)}/api/auth/oauth/github/callback`

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })
  const tokenPayload = await tokenRes.json()
  const accessToken = tokenPayload.access_token
  if (!accessToken) {
    throw new Error(`GitHub token exchange failed: ${JSON.stringify(tokenPayload)}`)
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'sibs-user-api',
    },
  })
  const user = await userRes.json()
  if (!user?.id) throw new Error('GitHub user fetch failed')

  let email = typeof user.email === 'string' ? user.email : null
  if (!email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sibs-user-api',
      },
    })
    const emails = await emailRes.json()
    if (Array.isArray(emails)) {
      const primary = emails.find((item) => item.primary && item.verified)
      email = primary?.email ?? emails.find((item) => item.verified)?.email ?? null
    }
  }
  if (!email) throw new Error('GitHub account has no verified email')

  return {
    provider: 'github',
    providerUserId: String(user.id),
    email: email.toLowerCase(),
    displayName: user.name || user.login || email,
  }
}

async function exchangeGoogleCode(req, code) {
  const clientId = requireEnv('GOOGLE_CLIENT_ID')
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET')
  const redirectUri = `${getApiPublicBaseUrl(req)}/api/auth/oauth/google/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokenPayload = await tokenRes.json()
  const accessToken = tokenPayload.access_token
  if (!accessToken) {
    throw new Error(`Google token exchange failed: ${JSON.stringify(tokenPayload)}`)
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const user = await userRes.json()
  if (!user?.sub || !user?.email) throw new Error('Google userinfo missing email')

  return {
    provider: 'google',
    providerUserId: String(user.sub),
    email: String(user.email).toLowerCase(),
    displayName: user.name || user.email,
  }
}

/** @param {'github' | 'google'} provider */
export async function exchangeOAuthCode(req, provider, code) {
  if (provider === 'github') return exchangeGitHubCode(req, code)
  if (provider === 'google') return exchangeGoogleCode(req, code)
  throw new Error(`Unsupported OAuth provider: ${provider}`)
}

export function buildOAuthSuccessRedirect({ token, email }) {
  const base = getOAuthFrontendRedirectUrl()
  const hash = new URLSearchParams({
    token,
    email,
  })
  return `${base}#${hash.toString()}`
}

export function buildOAuthFailureRedirect(code) {
  const base = getOAuthFrontendRedirectUrl()
  const hash = new URLSearchParams({ oauth_error: code })
  return `${base}#${hash.toString()}`
}

export function oauthProviderFingerprint(provider, providerUserId) {
  return createHash('sha256').update(`${provider}:${providerUserId}`).digest('hex').slice(0, 24)
}
