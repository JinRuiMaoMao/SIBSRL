import { routes } from './routes'
import type { BilingualText } from '../types/route'

export const ROUTE_77XA_ID = '77XA'
export const ROUTE_77XA_AUDIO_DIR = './audio/routes/77XA'
export const ROUTE_77XA_AT_PREFIX = '77xa-at'

export interface RouteStopAudioAtRow {
  atStopIndex: number
  nextStopLabel: BilingualText
  audioUrl: string
}

/** 77XA 当前站报站音频（0 起，与 sync 输出一致） */
const ROUTE_77XA_AT_STOP_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

function audioUrlForAtStop(atStopIndex: number): string {
  return `${ROUTE_77XA_AUDIO_DIR}/${ROUTE_77XA_AT_PREFIX}-${String(atStopIndex).padStart(2, '0')}.mp3`
}

export function getRoute77XAStopAudioByAtIndex(): Map<number, RouteStopAudioAtRow> | null {
  const route = routes.find((r) => r.id === ROUTE_77XA_ID)
  const stopList = route?.stops?.[0]?.list
  if (!stopList?.length) return null

  const map = new Map<number, RouteStopAudioAtRow>()

  for (const at of ROUTE_77XA_AT_STOP_INDICES) {
    const next = stopList[at + 1]
    const label =
      at === 10
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
