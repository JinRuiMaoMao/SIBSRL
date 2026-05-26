import type { MessageKey } from './messages'
import type { RouteTypeFilter } from '../types/route'
import { ROUTE_SERVICE_TYPE_ORDER } from '../data/routeServiceTypes.generated'

export const TYPE_FILTER_ORDER: RouteTypeFilter[] = [
  'centralAxis',
  ...ROUTE_SERVICE_TYPE_ORDER,
]

export const TYPE_FILTER_KEYS: Record<RouteTypeFilter, MessageKey> = {
  centralAxis: 'categoryCentralAxis',
  night: 'serviceTypeNight',
  sightseeing: 'serviceTypeSightseeing',
  event: 'serviceTypeEvent',
  festival: 'serviceTypeFestival',
  staffShuttle: 'serviceTypeStaffShuttle',
  university: 'serviceTypeUniversity',
  peakExpress: 'serviceTypePeakExpress',
  semiDirect: 'serviceTypeSemiDirect',
  loop: 'serviceTypeLoop',
  specialDeparture: 'serviceTypeSpecialDeparture',
  stadium: 'serviceTypeStadium',
}
