export interface TimetableIntervalBand {
  time: string
  interval: string
}

export interface TimetableScheduleEntry {
  serviceDays: string
  firstTime?: string
  lastTime?: string
  interval?: TimetableIntervalBand[]
  routeCode?: string
  customDaysCn?: string
  customDaysEn?: string
  unlockLevel?: number
}

export interface GameRouteStopEntry {
  seq: number
  nameCn: string
  nameEn: string
  nameSubCn?: string
  nameSubEn?: string
}

/** 游戏内 routeData 单条线路（班次时刻表来源） */
export interface GameRouteTimetableRecord {
  route: string
  bound?: string
  circular?: boolean
  timetable: Record<string, Record<string, TimetableScheduleEntry[]>>
  stops?: Record<string, GameRouteStopEntry[]>
}

export interface RouteTimetablesFile {
  data: GameRouteTimetableRecord[]
}

export interface ServiceWindow {
  /** 自 0:00 起的分钟数（可超过 1440 表示跨日） */
  start: number
  end: number
}
