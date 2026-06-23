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
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)
  return db
}

/** @param {import('better-sqlite3').Database} db */
export function findUserByEmail(db, email) {
  return db.prepare('SELECT id, email, password_hash, created_at FROM users WHERE email = ?').get(email)
}

/** @param {import('better-sqlite3').Database} db */
export function findUserById(db, userId) {
  return db.prepare('SELECT id, email, password_hash, created_at FROM users WHERE id = ?').get(userId)
}

/** @param {import('better-sqlite3').Database} db */
export function createUser(db, { id, email, passwordHash, createdAt }) {
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    email,
    passwordHash,
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
  return db.prepare('SELECT user_id, favorites_json, updated_at FROM user_data WHERE user_id = ?').get(userId)
}

/** @param {import('better-sqlite3').Database} db */
export function upsertUserData(db, userId, favoritesJson, updatedAt) {
  db.prepare(`
    INSERT INTO user_data (user_id, favorites_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      favorites_json = excluded.favorites_json,
      updated_at = excluded.updated_at
  `).run(userId, favoritesJson, updatedAt)
}
