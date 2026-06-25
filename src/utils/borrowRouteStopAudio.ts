import type { BilingualText } from '../types/route'
import type { RouteStopAudioAtRow } from '../data/routeStopAudio21A'
import { getRouteDirectionStopAudioByAtIndex } from '../data/routeStopAudioByDirection.generated'
import { routes } from '../data/routes'

function normalizeDirectionKey(key: string | undefined): string | undefined {
  return key?.trim().toLowerCase()
}

function stopNamesMatch(a: BilingualText, b: BilingualText): boolean {
  const aZh = a.zh?.trim() ?? ''
  const bZh = b.zh?.trim() ?? ''
  const aEn = a.en?.trim() ?? ''
  const bEn = b.en?.trim() ?? ''
  if (aZh && bZh && aZh === bZh) return true
  if (aEn && bEn && aEn === bEn) return true
  return false
}

/** Routes whose synced direction audio other lines may reuse when stop pairs match. */
const ROUTE_AUDIO_DONOR_IDS = ['N171'] as const

/**
 * Reuse another route's direction-synced clip when current + next stop names match.
 */
export function borrowRouteStopAudioAtRow(
  routeId: string,
  atStopIndex: number,
  directionGroupIndex: number,
): RouteStopAudioAtRow | undefined {
  const route = routes.find((item) => item.id === routeId)
  const targetGroup = route?.stops?.[directionGroupIndex]
  const targetList = targetGroup?.list
  if (!targetList?.length || atStopIndex >= targetList.length - 1) return undefined

  const current = targetList[atStopIndex]?.name
  const next = targetList[atStopIndex + 1]?.name
  if (!current || !next) return undefined

  const targetDirectionKey = normalizeDirectionKey(targetGroup?.directionKey)

  for (const donorId of ROUTE_AUDIO_DONOR_IDS) {
    const donor = routes.find((item) => item.id === donorId)
    if (!donor?.stops?.length) continue

    for (let donorGroupIndex = 0; donorGroupIndex < donor.stops.length; donorGroupIndex += 1) {
      const donorGroup = donor.stops[donorGroupIndex]
      if (
        targetDirectionKey &&
        normalizeDirectionKey(donorGroup.directionKey) !== targetDirectionKey
      ) {
        continue
      }

      const donorList = donorGroup.list
      const donorMap = getRouteDirectionStopAudioByAtIndex(donorId, donorGroupIndex)
      if (!donorMap?.size) continue

      for (let donorAt = 0; donorAt < donorList.length - 1; donorAt += 1) {
        const donorCurrent = donorList[donorAt]?.name
        const donorNext = donorList[donorAt + 1]?.name
        if (!donorCurrent || !donorNext) continue
        if (!stopNamesMatch(donorCurrent, current) || !stopNamesMatch(donorNext, next)) continue

        const borrowed = donorMap.get(donorAt)
        if (!borrowed) continue

        return {
          atStopIndex,
          nextStopLabel: next,
          audioUrl: borrowed.audioUrl,
        }
      }
    }
  }

  return undefined
}
