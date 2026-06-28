import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const DEFAULT_DB_PATH = 'data/users.db'

/** @param {string} [dbPath] */
export function openUserDatabase(dbPath = process.env.USER_DB_PATH ?? DEFAULT_DB_PATH) {
  const absolute = resolve(process.cwd(), dbPath)
  mkdirSync(dirname(absolute), { recursive: true })
  const db = new Database(absolute)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      email TEXT NOT NULL COLLATE NOCASE,
      purpose TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      last_sent_at INTEGER NOT NULL,
      PRIMARY KEY (email, purpose)
    );

    CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT PRIMARY KEY,
      favorites_json TEXT,
      profile_json TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS oauth_identities (
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      email TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (provider, provider_user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS route_feedback (
      id TEXT PRIMARY KEY,
      route_id TEXT,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      contact_email TEXT,
      client_ip TEXT,
      created_at INTEGER NOT NULL
    );
  `)

  const userDataColumns = db.prepare('PRAGMA table_info(user_data)').all()
  if (!userDataColumns.some((column) => column.name === 'profile_json')) {
    db.exec('ALTER TABLE user_data ADD COLUMN profile_json TEXT')
  }

  const userColumns = db.prepare('PRAGMA table_info(users)').all()
  if (!userColumns.some((column) => column.name === 'is_admin')) {
    db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0')
  }

  ensureDefaultAdmins(db)

  return db
}

const DEFAULT_ADMIN_EMAILS = ['gengyue_sun@outlook.com']

/** @param {import('better-sqlite3').Database} db */
export function ensureDefaultAdmins(db) {
  const configured = String(process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  const emails = [...new Set([...DEFAULT_ADMIN_EMAILS, ...configured].map((email) => email.toLowerCase()))]
  if (emails.length === 0) return

  const stmt = db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?')
  for (const email of emails) {
    stmt.run(email)
  }
}

export function isUserAdmin(user) {
  return Boolean(user?.is_admin)
}

/** @param {string | null | undefined} profileJson */
export function parseUserProfileJson(profileJson) {
  if (!profileJson) return { displayName: null, avatarDataUrl: null }
  try {
    const parsed = JSON.parse(profileJson)
    const displayName =
      typeof parsed.displayName === 'string' ? parsed.displayName.trim().slice(0, 32) : null
    const avatarDataUrl =
      typeof parsed.avatarDataUrl === 'string' && parsed.avatarDataUrl.startsWith('data:image/')
        ? parsed.avatarDataUrl
        : null
    return {
      displayName: displayName || null,
      avatarDataUrl,
    }
  } catch {
    return { displayName: null, avatarDataUrl: null }
  }
}

/** @param {{ displayName?: string | null, avatarDataUrl?: string | null }} profile */
export function buildUserProfileJson(profile) {
  const payload = {}
  if (profile.displayName) payload.displayName = profile.displayName
  if (profile.avatarDataUrl) payload.avatarDataUrl = profile.avatarDataUrl
  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : null
}

export function isOAuthOnlyUser(user) {
  const hash = user?.password_hash
  return typeof hash !== 'string' || hash.length === 0
}

/** @param {import('better-sqlite3').Database} db */
export function findUserByEmail(db, email) {
  return db
    .prepare('SELECT id, email, password_hash, created_at, is_admin FROM users WHERE email = ?')
    .get(email)
}

/** @param {import('better-sqlite3').Database} db */
export function findUserById(db, userId) {
  return db
    .prepare('SELECT id, email, password_hash, created_at, is_admin FROM users WHERE id = ?')
    .get(userId)
}

/** @param {import('better-sqlite3').Database} db */
export function createUser(db, { id, email, passwordHash, createdAt }) {
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    email,
    passwordHash ?? '',
    createdAt,
  )
}

/** @param {import('better-sqlite3').Database} db */
export function updateUserPassword(db, email, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email)
}

/** @param {import('better-sqlite3').Database} db */
export function getVerificationCode(db, email, purpose) {
  return db
    .prepare(
      'SELECT email, purpose, code, expires_at, last_sent_at FROM verification_codes WHERE email = ? AND purpose = ?',
    )
    .get(email, purpose)
}

/** @param {import('better-sqlite3').Database} db */
export function upsertVerificationCode(db, { email, purpose, code, expiresAt, lastSentAt }) {
  db.prepare(`
    INSERT INTO verification_codes (email, purpose, code, expires_at, last_sent_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email, purpose) DO UPDATE SET
      code = excluded.code,
      expires_at = excluded.expires_at,
      last_sent_at = excluded.last_sent_at
  `).run(email, purpose, code, expiresAt, lastSentAt)
}

/** @param {import('better-sqlite3').Database} db */
export function deleteVerificationCode(db, email, purpose) {
  db.prepare('DELETE FROM verification_codes WHERE email = ? AND purpose = ?').run(email, purpose)
}

/** @param {import('better-sqlite3').Database} db */
export function getUserData(db, userId) {
  return db
    .prepare('SELECT user_id, favorites_json, profile_json, updated_at FROM user_data WHERE user_id = ?')
    .get(userId)
}

/** @param {import('better-sqlite3').Database} db */
export function upsertUserData(db, userId, favoritesJson, updatedAt) {
  const existing = getUserData(db, userId)
  const profileJson = existing?.profile_json ?? null
  db.prepare(`
    INSERT INTO user_data (user_id, favorites_json, profile_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      favorites_json = excluded.favorites_json,
      updated_at = excluded.updated_at
  `).run(userId, favoritesJson, profileJson, updatedAt)
}

/** @param {import('better-sqlite3').Database} db */
export function updateUserProfile(db, userId, profile) {
  const row = getUserData(db, userId)
  const profileJson = buildUserProfileJson(profile)
  const updatedAt = Date.now()
  if (row) {
    db.prepare('UPDATE user_data SET profile_json = ?, updated_at = ? WHERE user_id = ?').run(
      profileJson,
      updatedAt,
      userId,
    )
  } else {
    db.prepare(
      'INSERT INTO user_data (user_id, favorites_json, profile_json, updated_at) VALUES (?, ?, ?, ?)',
    ).run(userId, null, profileJson, updatedAt)
  }
  return updatedAt
}

/** @param {import('better-sqlite3').Database} db */
export function findUserByOAuth(db, provider, providerUserId) {
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.password_hash, u.created_at, u.is_admin
       FROM oauth_identities o
       JOIN users u ON u.id = o.user_id
       WHERE o.provider = ? AND o.provider_user_id = ?`,
    )
    .get(provider, providerUserId)
  return row ?? null
}

/** @param {import('better-sqlite3').Database} db */
export function linkOAuthIdentity(db, { provider, providerUserId, userId, email, createdAt }) {
  db.prepare(`
    INSERT INTO oauth_identities (provider, provider_user_id, user_id, email, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_user_id) DO UPDATE SET
      user_id = excluded.user_id,
      email = excluded.email
  `).run(provider, providerUserId, userId, email, createdAt)
}

/** @param {import('better-sqlite3').Database} db */
export function setUserAdminByEmail(db, email, isAdmin) {
  return db.prepare('UPDATE users SET is_admin = ? WHERE email = ?').run(isAdmin ? 1 : 0, email)
}

/** @param {import('better-sqlite3').Database} db */
export function deleteUser(db, userId) {
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
}

/** @param {import('better-sqlite3').Database} db */
export function insertRouteFeedback(db, { id, routeId, category, message, contactEmail, clientIp, createdAt }) {
  db.prepare(`
    INSERT INTO route_feedback (id, route_id, category, message, contact_email, client_ip, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, routeId ?? null, category, message, contactEmail ?? null, clientIp ?? null, createdAt)
}
