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
  signToken,
  validatePassword,
  verificationExpiresAt,
  verifyPassword,
  verifyToken,
} from './lib/user-auth.mjs'
import {
  createUser,
  deleteVerificationCode,
  findUserByEmail,
  getUserData,
  getVerificationCode,
  openUserDatabase,
  updateUserPassword,
  upsertUserData,
  upsertVerificationCode,
} from './lib/user-db.mjs'
import { resolveMailProvider, sendVerificationEmail } from './lib/user-mail.mjs'

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

const db = openUserDatabase()

/** @param {import('node:http').IncomingMessage} req */
function resolveCorsOrigin(req) {
  const raw = config.corsOrigin.trim()
  if (!raw || raw === '*') return '*'
  const allowed = raw.split(',').map((part) => part.trim()).filter(Boolean)
  const origin = req.headers.origin
  if (origin && allowed.includes(origin)) return origin
  return allowed[0] ?? '*'
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {number} status @param {unknown} body */
function json(req, res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': resolveCorsOrigin(req),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  })
  res.end(payload)
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {number} status @param {string} code @param {string} message */
function error(req, res, status, code, message) {
  json(req, res, status, { error: code, message })
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
    await sendVerificationEmail({ to: email, code, purpose })
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
  if (!user || !(await verifyPassword(password, user.password_hash))) {
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

const server = createServer(async (req, res) => {
  const method = req.method ?? 'GET'
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': resolveCorsOrigin(req),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
