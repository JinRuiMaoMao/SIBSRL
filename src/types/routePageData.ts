import type { BilingualText } from './route'

/** 线路 HTML 内可编辑的分站报站（0 起，对应详情表「在此站上车」行） */
export interface RoutePageStopAudio {
  audioUrl: string
  nextStop?: BilingualText
}

/** 线路 HTML 内分站：可写简式 { zh, en, zone } 或完整 { name: { zh, en }, zone } */
export type RoutePageStop =
  | {
      name: BilingualText
      nameSub?: BilingualText
      turningPoint?: boolean
      zone?: number
      distanceFromPreviousMeters?: number
      audio?: RoutePageStopAudio
    }
  | (BilingualText & {
      nameSub?: BilingualText
      turningPoint?: boolean
      zone?: number
      distanceFromPreviousMeters?: number
      audio?: RoutePageStopAudio
    })

export interface RoutePageStopGroup {
  direction?: BilingualText
  directionKey?: 'N' | 'S' | 'E' | 'W' | string
  serviceTime?: BilingualText
  length?: BilingualText
  list: RoutePageStop[]
}

/**
 * 写入 routes/{id}.html 的 JSON 结构（编辑后刷新详情即可生效，无需改 TS）。
 * 未填写的字段仍使用 routes.ts / Wiki 导入数据。
 */
export interface RoutePageData {
  id: string
  operators?: string[]
  fare?: string
  interval?: BilingualText
  journeyTime?: BilingualText
  serviceTime?: BilingualText
  length?: BilingualText
  notes?: BilingualText
  eventTitle?: BilingualText
  eventAbout?: BilingualText
  origin?: BilingualText
  destination?: BilingualText
  via?: BilingualText
  stops?: RoutePageStopGroup[]
  /** 额外报站行（按 atStopIndex，0 起） */
  stopAudio?: Array<
    RoutePageStopAudio & {
      atStopIndex: number
    }
  >
}

export type RoutePageDataPatch = Omit<RoutePageData, 'id'>
