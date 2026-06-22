import { resolve } from 'node:path'

/** Route id → safe filename (Windows cannot use * # % in paths). */
export function wikiImportBasename(id) {
  return id
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/\*/g, '%2A')
}

export function wikiImportPath(dir, id) {
  return resolve(dir, `${wikiImportBasename(id)}.json`)
}

/** Legacy filenames before encodeURIComponent (476# → 476_.json, etc.). */
const LEGACY_BASENAMES = {
  '476#': '476_',
  '476#*': '476__',
}

export function legacyWikiImportBasename(id) {
  return LEGACY_BASENAMES[id] ?? id.replace(/[%#*]/g, '_')
}
