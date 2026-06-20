import type { BusRoute } from './route'
import type { MatchedStop } from '../utils/routeStopLookup'

export interface RouteLeg {
  route: BusRoute
  directionIndex: number
  from: MatchedStop
  to: MatchedStop
}

export interface TransferPlan {
  legs: RouteLeg[]
  transferCount: number
}
