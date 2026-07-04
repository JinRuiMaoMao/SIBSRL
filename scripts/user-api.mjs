import { createServer } from 'node:http'
import process from 'node:process'
import {
  canSendCode,
  generateVerificationCode,
  hashPassword,
  isValidEmail,
  isVerificationExpired,
  normalizeEmail,
  randomUserId,
  randomApprovalToken,
  signToken,
  validatePassword,
  verificationExpiresAt,
  verifyPassword,
  verifyToken,
} from './lib/user-auth.mjs'
import {
  buildUserProfileJson,
  createUser,
  deleteUser,
  deleteVerificationCode,
  ensureDefaultAdmins,
  findUserByEmail,
  findUserById,
  findUserByOAuth,
  getUserData,
  getVerificationCode,
  getRouteMapImport,
  insertRouteFeedback,
  isOAuthOnlyUser,
  isUserAdmin,
  linkOAuthIdentity,
  openUserDatabase,
  parseUserProfileJson,
  createMapDrawPermissionRequest,
  canSendMapDrawPermissionRequest,
  approveMapDrawPermissionRequest,
  MAP_DRAW_REQUEST_TTL_MS,
  updateUserPassword,
  updateUserProfile,
  upsertRouteMapImport,
  upsertUserData,
  upsertVerificationCode,
} from './lib/user-db.mjs'
import {
  buildGitHubAuthorizeUrl,
  buildGoogleAuthorizeUrl,
  buildOAuthFailureRedirect,
  buildOAuthSuccessRedirect,
  consumeOAuthState,
  exchangeOAuthCode,
  getApiPublicBaseUrl,
  isGitHubOAuthConfigured,
  isGoogleOAuthConfigured,
} from './lib/user-oauth.mjs'
import { resolveMailProvider, sendVerificationEmail, sendMapDrawPermissionRequestEmail, buildMapDrawApprovalResultHtml } from './lib/user-mail.mjs'

const DEFAULT_PORT = 8788

function readPort() {
  const raw = process.env.PORT ?? process.env.USER_API_PORT
  if (!raw) return DEFAULT_PORT
  const port = Number(raw)
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid USER_API_PORT: ${raw}`)
  return port
}

const config = {
  port: readPort(),
  corsOrigin: process.env.USER_API_CORS_ORIGIN ?? '*',
}

const CORS_ALLOW_HEADERS = 'Content-Type, Authorization'
const CORS_ALLOW_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'

const db = openUserDatabase()

/** @type {Map<string, { count: number, resetAt: number }>} */
const feedbackRateByIp = new Map()

function readClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  return req.socket?.remoteAddress ?? 'unknown'
}

function canSubmitFeedback(ip) {
  const now = Date.now()
  const entry = feedbackRateByIp.get(ip)
  if (!entry || now > entry.resetAt) {
    feedbackRateByIp.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 8) return false
  entry.count += 1
  return true
}

function redirect(res, location) {
  res.writeHead(302, { Location: location })
  res.end()
}

/** @param {import('node:http').IncomingMessage} req */
function normalizeCorsOrigin(value) {
  if (!value || typeof value !== 'string') return ''
  return value.trim().replace(/\/+$/, '')
}

/** @param {import('node:http').IncomingMessage} req */
function resolveCorsOrigin(req) {
  const raw = config.corsOrigin.trim()
  if (!raw || raw === '*') return '*'
  const allowed = raw
    .split(',')
    .map((part) => normalizeCorsOrigin(part))
    .filter(Boolean)
  const originHeader = req.headers.origin
  const origin = normalizeCorsOrigin(originHeader)
  if (origin && allowed.includes(origin)) return originHeader
  return allowed[0] ?? '*'
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {number} status @param {unknown} body */
function json(req, res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': resolveCorsOrigin(req),
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
  })
  res.end(payload)
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {number} status @param {string} code @param {string} message */
function error(req, res, status, code, message) {
  json(req, res, status, { error: code, message })
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {number} status @param {string} html */
function html(req, res, status, htmlBody) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(htmlBody),
    'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  })
  res.end(htmlBody)
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('invalid_json')
  }
}

function readBearer(req) {
  const header = req.headers.authorization ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1]?.trim() ?? null
}

function requireAuth(req, res) {
  const token = readBearer(req)
  if (!token) {
    error(req, res, 401, 'unauthorized', 'Missing bearer token')
    return null
  }
  const session = verifyToken(token)
  if (!session) {
    error(req, res, 401, 'unauthorized', 'Invalid or expired token')
    return null
  }
  return session
}

function countFavoriteRoutes(favorites) {
  if (!favorites?.folders || !Array.isArray(favorites.folders)) return 0
  const seen = new Set()
  for (const folder of favorites.folders) {
    if (!Array.isArray(folder?.routeIds)) continue
    for (const id of folder.routeIds) seen.add(id)
  }
  return seen.size
}

function buildProfilePayload(user, row, email) {
  return {
    email,
    oauthOnly: user ? isOAuthOnlyUser(user) : false,
    isAdmin: user ? isUserAdmin(user) : false,
    ...parseUserProfileJson(row?.profile_json),
  }
}

async function handleSendCode(req, res) {
  let body
  try {
    body = await readJson(req)
  } catch {
    return error(req, res, 400, 'invalid_json', 'Invalid JSON body')
  }

  const email = normalizeEmail(body.email)
  const purpose = body.purpose === 'reset' ? 'reset' : 'register'
  if (!isValidEmail(email)) return error(req, res, 400, 'invalid_email', 'Invalid email address')

  const existing = findUserByEmail(db, email)
  if (purpose === 'register' && existing) {
    return error(req, res, 409, 'email_taken', 'Email is already registered')
  }
  if (purpose === 'reset' && !existing) {
    return error(req, res, 404, 'email_not_found', 'Email is not registered')
  }

  const current = getVerificationCode(db, email, purpose)
  if (!canSendCode(current?.last_sent_at)) {
    return error(req, res, 429, 'rate_limited', 'Please wait before requesting another code')
  }

  const code = generateVerificationCode()
  const now = Date.now()
  upsertVerificationCode(db, {
    email,
    purpose,
    code,
    expiresAt: verificationExpiresAt(),
    lastSentAt: now,
  })

  try {
    await sendVerificationEmail({
      to: email,
      code,
      purpose,
      locale: typeof body.locale === 'string' ? body.locale : undefined,
    })
  } catch (err) {
    console.error('[user-api] send mail failed:', err)
    return error(req, res, 502, 'mail_failed', 'Failed to send verification email')
  }

  json(req, res, 200, { ok: true })
}

async function handleRegister(req, res) {
  let body
  try {
    body = await readJson(req)
  } catch {
    return error(req, res, 400, 'invalid_json', 'Invalid JSON body')
  }

  const email = normalizeEmail(body.email)
  const password = String(body.password ?? '')
  const code = String(body.code ?? '').trim()
  if (!isValidEmail(email)) return error(req, res, 400, 'invalid_email', 'Invalid email address')
  const passwordError = validatePassword(password)
  if (passwordError) return error(req, res, 400, passwordError, 'Invalid password')
  if (!/^\d{6}$/.test(code)) return error(req, res, 400, 'invalid_code', 'Invalid verification code')

  if (findUserByEmail(db, email)) {
    return error(req, res, 409, 'email_taken', 'Email is already registered')
  }

  const stored = getVerificationCode(db, email, 'register')
  if (!stored || stored.code !== code || isVerificationExpired(stored.expires_at)) {
    return error(req, res, 400, 'invalid_code', 'Verification code is invalid or expired')
  }

  const userId = randomUserId()
  const passwordHash = await hashPassword(password)
  createUser(db, { id: userId, email, passwordHash, createdAt: Date.now() })
  deleteVerificationCode(db, email, 'register')
  ensureDefaultAdmins(db)

  const token = signToken(userId, email)
  json(req, res, 201, { token, email })
}

async function handleLogin(req, res) {
  let body
  try {
    body = await readJson(req)
  } catch {
    return error(req, res, 400, 'invalid_json', 'Invalid JSON body')
  }

  const email = normalizeEmail(body.email)
  const password = String(body.password ?? '')
  if (!isValidEmail(email)) return error(req, res, 400, 'invalid_email', 'Invalid email address')

  const user = findUserByEmail(db, email)
  if (!user) {
    return error(req, res, 401, 'invalid_credentials', 'Invalid email or password')
  }
  if (isOAuthOnlyUser(user)) {
    return error(req, res, 401, 'oauth_only_account', 'This account uses third-party sign-in')
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    return error(req, res, 401, 'invalid_credentials', 'Invalid email or password')
  }

  json(req, res, 200, { token: signToken(user.id, user.email), email: user.email })
}

async function handleResetPassword(req, res) {
  let body
  try {
    body = await readJson(req)
  } catch {
    return error(req, res, 400, 'invalid_json', 'Invalid JSON body')
  }

  const email = normalizeEmail(body.email)
  const password = String(body.password ?? '')
  const code = String(body.code ?? '').trim()
  if (!isValidEmail(email)) return error(req, res, 400, 'invalid_email', 'Invalid email address')
  const passwordError = validatePassword(password)
  if (passwordError) return error(req, res, 400, passwordError, 'Invalid password')
  if (!/^\d{6}$/.test(code)) return error(req, res, 400, 'invalid_code', 'Invalid verification code')

  const user = findUserByEmail(db, email)
  if (!user) return error(req, res, 404, 'email_not_found', 'Email is not registered')

  const stored = getVerificationCode(db, email, 'reset')
  if (!stored || stored.code !== code || isVerificationExpired(stored.expires_at)) {
    return error(req, res, 400, 'invalid_code', 'Verification code is invalid or expired')
  }

  await updateUserPassword(db, email, await hashPassword(password))
  deleteVerificationCode(db, email, 'reset')
  json(req, res, 200, { ok: true })
}

function handleGetUserData(req, res) {
  const session = requireAuth(req, res)
  if (!session) return

  const user = findUserById(db, session.userId)
  const row = getUserData(db, session.userId)
  let favorites = null
  if (row?.favorites_json) {
    try {
      favorites = JSON.parse(row.favorites_json)
    } catch {
      favorites = null
    }
  }

  json(req, res, 200, {
    favorites,
    updatedAt: row?.updated_at ?? null,
    favoriteCount: favorites ? countFavoriteRoutes(favorites) : 0,
    profile: buildProfilePayload(user, row, session.email),
  })
}

async function handlePutUserData(req, res) {
  const session = requireAuth(req, res)
  if (!session) return

  let body
  try {
    body = await readJson(req)
  } catch {
    return error(req, res, 400, 'invalid_json', 'Invalid JSON body')
  }

  if (!body.favorites || body.favorites.version !== 2 || !Array.isArray(body.favorites.folders)) {
    return error(req, res, 400, 'invalid_favorites', 'Invalid favorites payload')
  }

  const updatedAt = Date.now()
  upsertUserData(db, session.userId, JSON.stringify(body.favorites), updatedAt)
  json(req, res, 200, { updatedAt })
}

async function handlePatchUserProfile(req, res) {
  const session = requireAuth(req, res)
  if (!session) return

  let body
  try {
    body = await readJson(req)
  } catch {
    return error(req, res, 400, 'invalid_json', 'Invalid JSON body')
  }

  const user = findUserById(db, session.userId)
  const row = getUserData(db, session.userId)
  const current = parseUserProfileJson(row?.profile_json)

  let displayName = current.displayName
  if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
    const raw = String(body.displayName ?? '').trim()
    if (raw.length > 32) {
      return error(req, res, 400, 'invalid_display_name', 'Display name is too long')
    }
    displayName = raw || null
  }

  let avatarDataUrl = current.avatarDataUrl
  if (Object.prototype.hasOwnProperty.call(body, 'avatarDataUrl')) {
    const raw = body.avatarDataUrl
    if (raw === null || raw === '') {
      avatarDataUrl = null
    } else if (typeof raw === 'string') {
      if (!/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(raw)) {
        return error(req, res, 400, 'invalid_avatar', 'Avatar must be a JPEG, PNG, WebP, or GIF image')
      }
      if (raw.length > 200_000) {
        return error(req, res, 400, 'avatar_too_large', 'Avatar image is too large')
      }
      avatarDataUrl = raw
    } else {
      return error(req, res, 400, 'invalid_avatar', 'Avatar must be a JPEG, PNG, WebP, or GIF image')
    }
  }

  const updatedAt = updateUserProfile(db, session.userId, { displayName, avatarDataUrl })
  json(req, res, 200, {
    ok: true,
    updatedAt,
    profile: buildProfilePayload(user, { profile_json: buildUserProfileJson({ displayName, avatarDataUrl }) }, session.email),
  })
}

async function handleChangePassword(req, res) {
  const session = requireAuth(req, res)
  if (!session) return

  let body
  try {
    body = await readJson(req)
  } catch {
    return error(req, res, 400, 'invalid_json', 'Invalid JSON body')
  }

  const user = findUserByEmail(db, session.email)
  if (!user) return error(req, res, 404, 'email_not_found', 'Email is not registered')
  if (isOAuthOnlyUser(user)) {
    return error(req, res, 400, 'oauth_only_account', 'This account uses third-party sign-in')
  }

  const currentPassword = String(body.currentPassword ?? '')
  const newPassword = String(body.newPassword ?? '')
  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    return error(req, res, 401, 'invalid_credentials', 'Current password is incorrect')
  }

  const passwordError = validatePassword(newPassword)
  if (passwordError) return error(req, res, 400, passwordError, 'Invalid password')

  await updateUserPassword(db, session.email, await hashPassword(newPassword))
  json(req, res, 200, { ok: true })
}

async function handleDeleteAccount(req, res) {
  const session = requireAuth(req, res)
  if (!session) return

  let body = {}
  try {
    body = await readJson(req)
  } catch {
    body = {}
  }

  const user = findUserByEmail(db, session.email)
  if (!user) return error(req, res, 404, 'email_not_found', 'Email is not registered')

  if (!isOAuthOnlyUser(user)) {
    const currentPassword = String(body.currentPassword ?? '')
    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      return error(req, res, 401, 'invalid_credentials', 'Current password is incorrect')
    }
  }

  deleteUser(db, session.userId)
  json(req, res, 200, { ok: true })
}

async function handleMapDrawRequest(req, res) {
  const session = requireAuth(req, res)
  if (!session) return

  const user = findUserById(db, session.userId)
  if (!user) return error(req, res, 404, 'user_not_found', 'User not found')
  if (isUserAdmin(user)) {
    return error(req, res, 409, 'already_admin', 'You already have map draw permission')
  }

  const now = Date.now()
  if (!canSendMapDrawPermissionRequest(db, user.id, now)) {
    return error(req, res, 429, 'rate_limited', 'Please wait before sending another request')
  }

  const token = randomApprovalToken()
  createMapDrawPermissionRequest(db, {
    id: randomUserId(),
    userId: user.id,
    email: user.email,
    token,
    createdAt: now,
    lastSentAt: now,
    expiresAt: now + MAP_DRAW_REQUEST_TTL_MS,
  })

  const approveUrl = `${getApiPublicBaseUrl(req)}/api/user/map-draw-approve?token=${encodeURIComponent(token)}`
  try {
    await sendMapDrawPermissionRequestEmail({
      applicantEmail: user.email,
      approveUrl,
    })
  } catch (err) {
    console.error('[user-api] map draw request mail failed:', err)
    return error(req, res, 502, 'mail_failed', 'Failed to send permission request email')
  }

  json(req, res, 200, { ok: true })
}

function handleMapDrawApprove(req, res, url) {
  const token = url.searchParams.get('token')?.trim() ?? ''
  if (!token) {
    return html(
      req,
      res,
      400,
      buildMapDrawApprovalResultHtml({
        applicantEmail: '',
        ok: false,
        reason: '缺少审批链接参数 / Missing approval token.',
      }),
    )
  }

  const request = approveMapDrawPermissionRequest(db, token)
  if (!request) {
    return html(
      req,
      res,
      400,
      buildMapDrawApprovalResultHtml({
        applicantEmail: '',
        ok: false,
        reason: '链接无效、已使用或已过期 / Link invalid, already used, or expired.',
      }),
    )
  }

  return html(
    req,
    res,
    200,
    buildMapDrawApprovalResultHtml({ applicantEmail: request.email, ok: true }),
  )
}

const ROUTE_MAP_ID_PATTERN = /^[A-Za-z0-9#%*+\-./]{1,32}$/
const ROUTE_MAP_MAX_BYTES = 2_000_000

function normalizeRouteMapId(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed || !ROUTE_MAP_ID_PATTERN.test(trimmed)) return null
  return trimmed
}

function readRouteMapPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  if (typeof raw.routeId !== 'string' || !Array.isArray(raw.directions) || raw.directions.length === 0) {
    return null
  }
  return raw
}

function handleGetRouteMapImport(req, res, routeIdRaw) {
  const routeId = normalizeRouteMapId(routeIdRaw)
  if (!routeId) return error(req, res, 400, 'invalid_route_id', 'Invalid route id')

  const row = getRouteMapImport(db, routeId)
  if (!row) return error(req, res, 404, 'not_found', 'Route map not found')

  let payload
  try {
    payload = JSON.parse(row.payload_json)
  } catch {
    return error(req, res, 500, 'invalid_stored_payload', 'Stored route map is invalid')
  }

  json(req, res, 200, {
    routeId: row.route_id,
    updatedAt: row.updated_at,
    payload,
  })
}

async function handlePutRouteMapImport(req, res, routeIdRaw) {
  const session = requireAuth(req, res)
  if (!session) return

  const user = findUserById(db, session.userId)
  if (!user) return error(req, res, 404, 'user_not_found', 'User not found')
  if (!isUserAdmin(user)) {
    return error(req, res, 403, 'forbidden', 'Admin permission required')
  }

  const routeId = normalizeRouteMapId(routeIdRaw)
  if (!routeId) return error(req, res, 400, 'invalid_route_id', 'Invalid route id')

  let body
  try {
    body = await readJson(req)
  } catch {
    return error(req, res, 400, 'invalid_json', 'Invalid JSON body')
  }

  const payload = readRouteMapPayload(body.payload ?? body)
  if (!payload) {
    return error(req, res, 400, 'invalid_payload', 'Payload must be a route map export JSON')
  }

  const payloadJson = JSON.stringify(payload)
  if (Buffer.byteLength(payloadJson, 'utf8') > ROUTE_MAP_MAX_BYTES) {
    return error(req, res, 413, 'payload_too_large', 'Route map JSON is too large')
  }

  const updatedAt = Date.now()
  upsertRouteMapImport(db, {
    routeId,
    payloadJson,
    updatedAt,
    updatedBy: session.userId,
  })

  json(req, res, 200, { ok: true, routeId, updatedAt })
}

async function handleRouteFeedback(req, res) {
  let body
  try {
    body = await readJson(req)
  } catch {
    return error(req, res, 400, 'invalid_json', 'Invalid JSON body')
  }

  const ip = readClientIp(req)
  if (!canSubmitFeedback(ip)) {
    return error(req, res, 429, 'rate_limited', 'Please wait before submitting more feedback')
  }

  const category = String(body.category ?? 'other').trim().slice(0, 40) || 'other'
  const message = String(body.message ?? '').trim()
  const routeId = body.routeId == null ? null : String(body.routeId).trim().slice(0, 80) || null
  const contactEmailRaw = body.contactEmail == null ? '' : String(body.contactEmail).trim()
  const contactEmail = contactEmailRaw && isValidEmail(contactEmailRaw) ? normalizeEmail(contactEmailRaw) : null

  if (message.length < 8) {
    return error(req, res, 400, 'invalid_message', 'Feedback message is too short')
  }
  if (message.length > 4000) {
    return error(req, res, 400, 'invalid_message', 'Feedback message is too long')
  }

  insertRouteFeedback(db, {
    id: randomUserId(),
    routeId,
    category,
    message,
    contactEmail,
    clientIp: ip,
    createdAt: Date.now(),
  })

  json(req, res, 201, { ok: true })
}

async function resolveOAuthLogin(req, identity) {
  const existingOAuth = findUserByOAuth(db, identity.provider, identity.providerUserId)
  if (existingOAuth) {
    return { userId: existingOAuth.id, email: existingOAuth.email }
  }

  const existingEmail = findUserByEmail(db, identity.email)
  if (existingEmail) {
    linkOAuthIdentity(db, {
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      userId: existingEmail.id,
      email: identity.email,
      createdAt: Date.now(),
    })
    return { userId: existingEmail.id, email: existingEmail.email }
  }

  const userId = randomUserId()
  createUser(db, { id: userId, email: identity.email, passwordHash: '', createdAt: Date.now() })
  linkOAuthIdentity(db, {
    provider: identity.provider,
    providerUserId: identity.providerUserId,
    userId,
    email: identity.email,
    createdAt: Date.now(),
  })
  if (identity.displayName) {
    updateUserProfile(db, userId, {
      displayName: String(identity.displayName).trim().slice(0, 32),
      avatarDataUrl: null,
    })
  }
  ensureDefaultAdmins(db)
  return { userId, email: identity.email }
}

async function handleOAuthStart(req, res, provider) {
  try {
    const url =
      provider === 'github'
        ? buildGitHubAuthorizeUrl(req)
        : provider === 'google'
          ? buildGoogleAuthorizeUrl(req)
          : null
    if (!url) return error(req, res, 404, 'not_found', 'Unsupported OAuth provider')
    return redirect(res, url)
  } catch (err) {
    console.error('[user-api] oauth start failed:', err)
    return error(req, res, 503, 'oauth_unconfigured', 'OAuth provider is not configured')
  }
}

async function handleOAuthCallback(req, res, provider) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError || !code || !state || !consumeOAuthState(state, provider)) {
    return redirect(res, buildOAuthFailureRedirect('oauth_denied'))
  }

  try {
    const identity = await exchangeOAuthCode(req, provider, code)
    const session = await resolveOAuthLogin(req, identity)
    const token = signToken(session.userId, session.email)
    return redirect(res, buildOAuthSuccessRedirect({ token, email: session.email }))
  } catch (err) {
    console.error('[user-api] oauth callback failed:', err)
    return redirect(res, buildOAuthFailureRedirect('oauth_failed'))
  }
}

function handleOAuthProviders(req, res) {
  json(req, res, 200, {
    github: isGitHubOAuthConfigured(),
    google: isGoogleOAuthConfigured(),
    frontendRedirect: getApiPublicBaseUrl(req),
  })
}

const server = createServer(async (req, res) => {
  const method = req.method ?? 'GET'
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': resolveCorsOrigin(req),
      'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
      'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
    })
    res.end()
    return
  }

  try {
    if (method === 'GET' && (path === '/' || path === '')) {
      return json(req, res, 200, {
        ok: true,
        service: 'user-api',
        healthz: '/healthz',
        sendCode: 'POST /api/auth/send-code',
        mailProvider: resolveMailProvider(),
      })
    }
    if (method === 'GET' && path === '/healthz') {
      return json(req, res, 200, {
        ok: true,
        service: 'user-api',
        mailProvider: resolveMailProvider(),
      })
    }
    if (method === 'POST' && path === '/api/auth/send-code') {
      return await handleSendCode(req, res)
    }
    if (method === 'POST' && path === '/api/auth/register') {
      return await handleRegister(req, res)
    }
    if (method === 'POST' && path === '/api/auth/login') {
      return await handleLogin(req, res)
    }
    if (method === 'POST' && path === '/api/auth/reset-password') {
      return await handleResetPassword(req, res)
    }
    if (method === 'GET' && path === '/api/user/data') {
      return handleGetUserData(req, res)
    }
    if (method === 'PUT' && path === '/api/user/data') {
      return await handlePutUserData(req, res)
    }
    if (method === 'PATCH' && path === '/api/user/profile') {
      return await handlePatchUserProfile(req, res)
    }
    if (method === 'GET' && path === '/api/auth/oauth/providers') {
      return handleOAuthProviders(req, res)
    }
    if (method === 'GET' && path === '/api/auth/oauth/github/start') {
      return await handleOAuthStart(req, res, 'github')
    }
    if (method === 'GET' && path === '/api/auth/oauth/google/start') {
      return await handleOAuthStart(req, res, 'google')
    }
    if (method === 'GET' && path === '/api/auth/oauth/github/callback') {
      return await handleOAuthCallback(req, res, 'github')
    }
    if (method === 'GET' && path === '/api/auth/oauth/google/callback') {
      return await handleOAuthCallback(req, res, 'google')
    }
    if (method === 'POST' && path === '/api/auth/change-password') {
      return await handleChangePassword(req, res)
    }
    if (method === 'DELETE' && path === '/api/user/account') {
      return await handleDeleteAccount(req, res)
    }
    if (method === 'POST' && path === '/api/feedback/route') {
      return await handleRouteFeedback(req, res)
    }
    if (method === 'POST' && path === '/api/user/map-draw-request') {
      return await handleMapDrawRequest(req, res)
    }
    if (method === 'GET' && path === '/api/user/map-draw-approve') {
      return handleMapDrawApprove(req, res, url)
    }
    const routeMapMatch = /^\/api\/route-maps\/([^/]+)$/.exec(path)
    if (routeMapMatch) {
      const routeId = decodeURIComponent(routeMapMatch[1] ?? '')
      if (method === 'GET') return handleGetRouteMapImport(req, res, routeId)
      if (method === 'PUT') return await handlePutRouteMapImport(req, res, routeId)
    }
    return error(req, res, 404, 'not_found', 'Not found')
  } catch (err) {
    console.error('[user-api] unhandled error:', err)
    return error(req, res, 500, 'internal_error', 'Internal server error')
  }
})

server.listen(config.port, () => {
  const mailProvider = resolveMailProvider()
  console.log(`[user-api] listening on http://localhost:${config.port}`)
  console.log(`[user-api] mail provider: ${mailProvider ?? 'NOT CONFIGURED'}`)
})
