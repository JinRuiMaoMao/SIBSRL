import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCurrentStopAudioSlots } from './stop-name-audio-match.mjs'

export const ROUTE_N171_ID = 'N171'
export const ROUTE_N171_AT_PREFIX = 'n171'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const N171_JSON = resolve(root, 'data', 'wiki-import', 'N171.json')

/** @returns {{ directionKey: string, directionGroupIndex: number, list: { name: { zh?: string, en?: string } }[] }[]} */
export function loadN171StopGroups() {
  const data = JSON.parse(readFileSync(N171_JSON, 'utf8'))
  return (data.stops ?? []).map((group, directionGroupIndex) => ({
    directionKey: (group.directionKey ?? (directionGroupIndex === 0 ? 'N' : 'S')).toLowerCase(),
    directionGroupIndex,
    list: group.list ?? [],
  }))
}

/** @param {string} directionKey @param {number} atStopIndex */
export function n171DestFilename(directionKey, atStopIndex) {
  return `${ROUTE_N171_AT_PREFIX}-${directionKey}-at-${String(atStopIndex).padStart(2, '0')}.mp3`
}

/**
 * @param {{ directionKey: string, directionGroupIndex: number, list: { name: { zh?: string, en?: string } }[] }} group
 * @param {string[]} sourceFileNames
 */
export function buildRouteN171DirectionAudioSlots(group, sourceFileNames) {
  return buildCurrentStopAudioSlots(group.list, sourceFileNames).map((slot) => ({
    ...slot,
    directionKey: group.directionKey,
    directionGroupIndex: group.directionGroupIndex,
    destName: n171DestFilename(group.directionKey, slot.atStopIndex),
  }))
}

/** @param {string[]} sourceFileNames */
export function buildRouteN171StopAudioSlots(sourceFileNames) {
  return loadN171StopGroups().flatMap((group) =>
    buildRouteN171DirectionAudioSlots(group, sourceFileNames),
  )
}
