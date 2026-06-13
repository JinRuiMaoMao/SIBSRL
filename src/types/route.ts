export type RoutePattern = 'circular' | 'bidirectional' | 'oneway'

export type RouteCategory =
  | 'inner'
  | 'inter'
  | 'express'
  | 'night'
  | 'special'
  | 'centralAxis'

/** SIBS 服务类型（见 data/SIBS类型.txt，一线路可多项） */
export type RouteServiceType =
  | 'night'
  | 'sightseeing'
  | 'event'
  | 'festival'
  | 'staffShuttle'
  | 'university'
  | 'peakExpress'
  | 'semiDirect'
  | 'loop'
  | 'specialDeparture'
  | 'stadium'

/** 筛选与展示用的「类型」（SIBS 服务类型 + Central Axis） */
export type RouteTypeFilter = RouteServiceType | 'centralAxis'

/** 游戏内“常规/每日挑战/季节限定（限时）”分组筛选 */
export type RouteGroupFilter = 'all' | 'normal' | 'daily' | 'seasonal'

export interface BilingualText {
  zh: string
  en: string
}

export interface RouteStop {
  name: BilingualText
  zone?: number
}

export interface BusRoute {
  id: string
  number: string
  operators: string[]
  category: RouteCategory
  /** SIBS 服务类型标签（通宵、循环、特别班次等） */
  serviceTypes?: RouteServiceType[]
  pattern: RoutePattern
  zones: number[]
  origin: BilingualText
  destination: BilingualText
  via?: BilingualText
  serviceTime?: BilingualText
  interval?: BilingualText
  journeyTime?: BilingualText
  fare?: string | BilingualText
  levelRequired?: number
  /** 解锁所需阳光碎片（Sunshards） */
  sunshardsRequired?: number
  length?: BilingualText
  /**
   * Stop lists per travel direction. More than one entry enables direction toggle on card & detail.
   * Use `directionKey` (N/S/E/W) plus bilingual `direction` labels; see `src/data/routes.ts` header comment.
   */
  stops?: {
    direction: BilingualText
    directionKey?: 'N' | 'S' | 'E' | 'W' | string
    /** Departure-point service hours for this direction (no dual-terminus combined text). */
    serviceTime?: BilingualText
    /** 该方向全程长度（卡片右上角 KM，优先于路线级 length） */
    length?: BilingualText
    list: RouteStop[]
  }[]
  notes?: BilingualText
  wikiUrl?: string
  externalUrl?: string
}

export interface RouteFilters {
  query: string
  zone: number | 'all'
  operator: string | 'all'
  type: RouteTypeFilter | 'all'
}
