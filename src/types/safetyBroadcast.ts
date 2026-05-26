import type { BilingualText } from './route'

/** 广播版本：除 Horizon Bus 外 FT / FTCC / REBC / CSB 共用 common */
export type BroadcastSet = 'common' | 'horizon'

export interface SafetyBroadcast {
  id: string
  set: BroadcastSet
  /** 游戏内广播编号（通用集无 7） */
  number: number
  title: BilingualText
  /** 文稿；仅有音频时可省略 */
  text?: BilingualText
  audioUrl: string
  note?: BilingualText
}
