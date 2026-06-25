import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasWikiImportStops } from './route-direction-audio-map.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const WIKI_IMPORT_DIR = resolve(root, 'data', 'wiki-import')

/** @param {string} root @param {string} routeId */
export function resolveRouteSourceDir(root, routeId) {
  const candidates = [
    routeId,
    routeId.toUpperCase(),
    routeId.toLowerCase(),
    join('REBC', routeId),
    join('线路', routeId),
    routeId.replace(/A$/i, ''),
    join('REBC', routeId.replace(/A$/i, '')),
  ]
  for (const name of candidates) {
    const dir = join(root, name)
    if (existsSync(dir)) return dir
  }
  return null
}

/** Routes with wiki-import stop lists and a matching source folder (excluding specials). */
export function discoverDirectionAudioRouteIds(audioRoot, options = {}) {
  const exclude = new Set(options.exclude ?? ['21A', '77XA'])
  /** @type {string[]} */
  const routeIds = []

  if (!existsSync(WIKI_IMPORT_DIR)) return routeIds

  for (const file of readdirSync(WIKI_IMPORT_DIR)) {
    if (!file.endsWith('.json') || file.startsWith('_')) continue
    const routeId = file.replace(/\.json$/i, '')
    if (exclude.has(routeId)) continue
    if (!hasWikiImportStops(routeId)) continue
    if (!resolveRouteSourceDir(audioRoot, routeId)) continue
    routeIds.push(routeId)
  }

  return routeIds.sort((a, b) => a.localeCompare(b, 'en'))
}
