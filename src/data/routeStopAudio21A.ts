import { routes } from './routes'
import type { BilingualText } from '../types/route'

export const ROUTE_21A_ID = '21A'
export const ROUTE_21A_AUDIO_DIR = './audio/routes/21A'
export const ROUTE_21A_AT_PREFIX = '21a-at'

export interface RouteStopAudioAtRow {
  atStopIndex: number
  nextStopLabel: BilingualText
  audioUrl: string
}

/** 有对应 MP3 的分站行（0 起，与 sync 输出一致） */
const ROUTE_21A_AT_STOP_INDICES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
] as const

function audioUrlForAtStop(atStopIndex: number): string {
  return `${ROUTE_21A_AUDIO_DIR}/${ROUTE_21A_AT_PREFIX}-${String(atStopIndex).padStart(2, '0')}.mp3`
}

export function getRoute21AStopAudioByAtIndex(): Map<number, RouteStopAudioAtRow> | null {
  const route = routes.find((r) => r.id === ROUTE_21A_ID)
  const stopList = route?.stops?.[0]?.list
  if (!stopList?.length) return null

  const map = new Map<number, RouteStopAudioAtRow>()

  for (const at of ROUTE_21A_AT_STOP_INDICES) {
    const next = stopList[at + 1]
    const label =
      at === 19
        ? { zh: '下车提醒', en: 'Alighting reminder' }
        : next?.name
    if (!label) continue
    map.set(at, {
      atStopIndex: at,
      nextStopLabel: label,
      audioUrl: audioUrlForAtStop(at),
    })
  }

  return map
}
