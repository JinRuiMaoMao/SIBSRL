import { normalizeAuthEmail } from '../utils/authEmail'

export type AuthFormDraftMode = 'register' | 'reset'

const STORAGE_KEY = 'sibs-auth-form-draft'
const MAX_AGE_MS = 15 * 60 * 1000

export interface AuthFormDraft {
  mode: AuthFormDraftMode
  email: string
  password: string
  code: string
  codeSent: boolean
  savedAt: number
}

function readRawDraft(): AuthFormDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const draft = JSON.parse(raw) as AuthFormDraft
    if (!draft || typeof draft !== 'object') return null
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (draft.mode !== 'register' && draft.mode !== 'reset') return null
    return draft
  } catch {
    return null
  }
}

export function readAuthFormDraft(mode: AuthFormDraftMode): Omit<AuthFormDraft, 'savedAt'> | null {
  const draft = readRawDraft()
  if (!draft || draft.mode !== mode) return null

  return {
    mode: draft.mode,
    email: draft.email,
    password: typeof draft.password === 'string' ? draft.password : '',
    code: typeof draft.code === 'string' ? draft.code : '',
    codeSent: Boolean(draft.codeSent),
  }
}

export function writeAuthFormDraft(draft: Omit<AuthFormDraft, 'savedAt'>): void {
  try {
    const normalizedEmail = normalizeAuthEmail(draft.email)
    const existing = readRawDraft()
    let password = draft.password

    if (
      !password &&
      existing &&
      existing.mode === draft.mode &&
      normalizeAuthEmail(existing.email) === normalizedEmail &&
      existing.password
    ) {
      password = existing.password
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...draft,
        email: normalizedEmail,
        password,
        savedAt: Date.now(),
      } satisfies AuthFormDraft),
    )
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearAuthFormDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors.
  }
}
