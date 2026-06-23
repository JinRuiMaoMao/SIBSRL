import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'

const JWT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const CODE_TTL_MS = 10 * 60 * 1000
const SEND_COOLDOWN_MS = 60 * 1000
const BCRYPT_ROUNDS = 12

function jwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) throw new Error('Missing JWT_SECRET')
  return secret
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url')
}

function fromBase64Url(input) {
  return Buffer.from(input, 'base64url')
}

export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePassword(password) {
  const value = String(password ?? '')
  if (value.length < 8) return 'password_too_short'
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'password_needs_letter_and_digit'
  return null
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function generateVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function verificationExpiresAt() {
  return Date.now() + CODE_TTL_MS
}

export function isVerificationExpired(expiresAt) {
  return Date.now() > expiresAt
}

export function canSendCode(lastSentAt) {
  if (!lastSentAt) return true
  return Date.now() - lastSentAt >= SEND_COOLDOWN_MS
}

export function signToken(userId, email) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Date.now()
  const payload = base64Url(
    JSON.stringify({
      sub: userId,
      email,
      iat: now,
      exp: now + JWT_TTL_MS,
    }),
  )
  const body = `${header}.${payload}`
  const signature = createHmac('sha256', jwtSecret()).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifyToken(token) {
  const parts = String(token ?? '').split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  const expected = createHmac('sha256', jwtSecret()).update(`${header}.${payload}`).digest('base64url')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(fromBase64Url(payload).toString('utf8'))
    if (typeof parsed.sub !== 'string' || typeof parsed.email !== 'string') return null
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null
    return { userId: parsed.sub, email: parsed.email }
  } catch {
    return null
  }
}

export function randomUserId() {
  return randomBytes(16).toString('hex')
}
