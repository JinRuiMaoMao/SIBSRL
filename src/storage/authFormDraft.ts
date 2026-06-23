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

export function readAuthFormDraft(
  email: string,
  mode: AuthFormDraftMode,
): Omit<AuthFormDraft, 'savedAt'> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const draft = JSON.parse(raw) as AuthFormDraft
    if (!draft || typeof draft !== 'object') return null
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (draft.mode !== mode) return null
    if (normalizeAuthEmail(draft.email) !== normalizeAuthEmail(email)) return null

    return {
      mode: draft.mode,
      email: draft.email,
      password: typeof draft.password === 'string' ? draft.password : '',
      code: typeof draft.code === 'string' ? draft.code : '',
      codeSent: Boolean(draft.codeSent),
    }
  } catch {
    return null
  }
}

export function writeAuthFormDraft(draft: Omit<AuthFormDraft, 'savedAt'>): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...draft,
        email: normalizeAuthEmail(draft.email),
        savedAt: Date.now(),
      }),
    )
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearAuthFormDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors.
  }
}
