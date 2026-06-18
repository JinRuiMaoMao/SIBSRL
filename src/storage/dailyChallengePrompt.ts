export const DAILY_CHALLENGE_PROMPT_SEEN_KEY = 'sibs-daily-challenge-prompt-seen'

export function hasSeenDailyChallengePrompt(): boolean {
  try {
    return localStorage.getItem(DAILY_CHALLENGE_PROMPT_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markDailyChallengePromptSeen(): void {
  try {
    localStorage.setItem(DAILY_CHALLENGE_PROMPT_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}
