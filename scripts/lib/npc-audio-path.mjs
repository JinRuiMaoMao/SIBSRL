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

/** Folder order in the NPC tab (includes empty categories). */
export const NPC_CATEGORY_ORDER = ['行车抱怨', '下车抱怨', '服务抱怨', '打招呼，感谢']

/** Display labels for category chips (folder name → UI label). */
export const NPC_CATEGORY_LABELS = {
  '打招呼，感谢': '感谢',
}

/** @param {string} category */
export function npcCategoryLabel(category) {
  return NPC_CATEGORY_LABELS[category] ?? category
}

/** @param {string[]} discovered */
export function sortNpcCategories(discovered) {
  const set = new Set(discovered)
  for (const category of NPC_CATEGORY_ORDER) {
    set.add(category)
  }
  return [...set].sort((a, b) => {
    const ai = NPC_CATEGORY_ORDER.indexOf(a)
    const bi = NPC_CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b, 'zh-Hans')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
