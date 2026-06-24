/** @param {string} segment */
export function encodeNpcPathSegment(segment) {
  return [...segment]
    .map((ch) => (/[A-Za-z0-9._-]/.test(ch) ? ch : encodeURIComponent(ch)))
    .join('')
}

/** @param {string} category @param {string} filename */
export function npcAudioRelativeUrl(category, filename) {
  return `./audio/npc/${encodeNpcPathSegment(category)}/${encodeNpcPathSegment(filename)}`
}

export const EXCLUDED_NPC_CATEGORIES = new Set(['没上车', '目的地错误'])
