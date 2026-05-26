import type { BilingualText } from './route'

/** 线路报站文稿（用于线路详情卡，非「广播」标签页） */
export type RouteBroadcastKind =
  | 'routeNumber'
  | 'nextStop'
  | 'terminus'
  | 'interchange'
  | 'special'

export interface RouteBroadcastLine {
  kind: RouteBroadcastKind
  text: BilingualText
  note?: BilingualText
}

export interface RouteBroadcast {
  routeId: string
  lines: RouteBroadcastLine[]
}
