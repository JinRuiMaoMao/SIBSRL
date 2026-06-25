import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCurrentStopAudioSlots } from './stop-name-audio-match.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const WIKI_IMPORT_DIR = resolve(root, 'data', 'wiki-import')

/** @param {string} routeId */
export function routeAudioFilePrefix(routeId) {
  return routeId.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** @param {string} routeId */
export function wikiImportPath(routeId) {
  return resolve(WIKI_IMPORT_DIR, `${routeId}.json`)
}

/** @param {string} routeId @returns {boolean} */
export function hasWikiImportStops(routeId) {
  const path = wikiImportPath(routeId)
  if (!existsSync(path)) return false
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(data.stops) && data.stops.some((group) => (group.list ?? []).length > 0)
  } catch {
    return false
  }
}

/**
 * @param {string} routeId
 * @returns {{ directionKey: string, directionGroupIndex: number, list: { name: { zh?: string, en?: string } }[] }[] | null}
 */
export function loadRouteStopGroups(routeId) {
  const path = wikiImportPath(routeId)
  if (!existsSync(path)) return null

  const data = JSON.parse(readFileSync(path, 'utf8'))
  const stops = data.stops ?? []
  if (!stops.length) return null

  return stops.map((group, directionGroupIndex) => ({
    directionKey: (group.directionKey ?? inferDirectionKey(group, directionGroupIndex)).toLowerCase(),
    directionGroupIndex,
    list: group.list ?? [],
  }))
}

/** @param {{ direction?: { zh?: string, en?: string } }} group @param {number} directionGroupIndex */
function inferDirectionKey(group, directionGroupIndex) {
  const text = `${group.direction?.zh ?? ''} ${group.direction?.en ?? ''}`
  if (/南行|southbound/i.test(text)) return 'S'
  if (/北行|northbound/i.test(text)) return 'N'
  if (/东行|eastbound/i.test(text)) return 'E'
  if (/西行|westbound/i.test(text)) return 'W'
  return directionGroupIndex === 0 ? 'N' : 'S'
}

/**
 * @param {{ directionKey: string, directionGroupIndex: number, list: { name: { zh?: string, en?: string } }[] }[]} groups
 * @param {{ directionKey: string }} group
 */
export function mirrorGroupForDirection(groups, group) {
  if (group.directionKey === 's') {
    return groups.find((item) => item.directionKey === 'n') ?? groups[0] ?? null
  }
  if (group.directionKey === 'w') {
    return groups.find((item) => item.directionKey === 'e') ?? null
  }
  return null
}

/** @param {string} routeId @param {string} directionKey @param {number} atStopIndex */
export function routeDirectionDestFilename(routeId, directionKey, atStopIndex) {
  const prefix = routeAudioFilePrefix(routeId)
  return `${prefix}-${directionKey}-at-${String(atStopIndex).padStart(2, '0')}.mp3`
}

/**
 * @param {string} routeId
 * @param {{ directionKey: string, directionGroupIndex: number, list: { name: { zh?: string, en?: string } }[] }} group
 * @param {string[]} sourceFileNames
 * @param {{ directionKey: string, list: { name: { zh?: string, en?: string } }[] } | null} [mirrorGroup]
 */
export function buildRouteDirectionGroupAudioSlots(routeId, group, sourceFileNames, mirrorGroup = null) {
  const directionKey = group.directionKey
  const mirrorStopList =
    directionKey === 's' || directionKey === 'w' ? (mirrorGroup?.list ?? null) : null

  return buildCurrentStopAudioSlots(group.list, sourceFileNames, {
    directionKey,
    mirrorStopList: mirrorStopList ?? undefined,
  }).map((slot) => ({
    ...slot,
    directionKey: group.directionKey,
    directionGroupIndex: group.directionGroupIndex,
    destName: routeDirectionDestFilename(routeId, group.directionKey, slot.atStopIndex),
  }))
}

/** @param {string} routeId @param {string[]} sourceFileNames */
export function buildRouteDirectionAudioSlots(routeId, sourceFileNames) {
  const groups = loadRouteStopGroups(routeId)
  if (!groups?.length) return []

  return groups.flatMap((group) =>
    buildRouteDirectionGroupAudioSlots(routeId, group, sourceFileNames, mirrorGroupForDirection(groups, group)),
  )
}
