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

/** Preferred folder order in the NPC tab (must match E:\\SIBS资源\\NPC folder names). */
export const NPC_CATEGORY_ORDER = [
  'Hello',
  'Bye',
  'Angry',
  'Complaint',
  'ComplaintSerious',
  'StopSkipped',
  'Wrong',
  'FareWrong',
  'DoorOpened',
  'DoorClosed',
  'Camera',
  'Cold',
  'Hot',
  'NoKneel',
]

/** Categories with no licensed audio yet — manifest gets a placeholder row each. */
export const NPC_PLACEHOLDER_CATEGORIES = new Set(['Cold', 'DoorClosed', 'Hot', 'NoKneel'])

/** @param {string[]} discovered */
export function sortNpcCategories(discovered) {
  return [...new Set(discovered)].sort((a, b) => {
    const ai = NPC_CATEGORY_ORDER.indexOf(a)
    const bi = NPC_CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b, 'zh-Hans')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
