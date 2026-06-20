import type { BusRoute } from './route'
import type { MatchedStop } from '../utils/routeStopLookup'

export interface RouteLeg {
  route: BusRoute
  directionIndex: number
  from: MatchedStop
  to: MatchedStop
}

export interface WalkSegment {
  from: MatchedStop
  to: MatchedStop
  minutes: number
}

export interface TransferPlan {
  legs: RouteLeg[]
  transferCount: number
  /** 下车后步行至查询终点 */
  walkToDestination?: WalkSegment
}
