import type { BilingualText } from './route'

/** 线路报站文稿（用于线路详情卡，非「广播」标签页） */
export type RouteBroadcastKind =
  | 'routeNumber'
  | 'nextStop'
  | 'terminus'
  | 'interchange'
  | 'special'

export interface RouteBroadcastLine {
  id: string
  kind: RouteBroadcastKind
  /** 对应分站序号（1 起） */
  stopIndex?: number
  text: BilingualText
  note?: BilingualText
  audioUrl: string
}

export interface RouteBroadcast {
  routeId: string
  lines: RouteBroadcastLine[]
}
