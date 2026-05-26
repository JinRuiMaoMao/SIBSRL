import type { MessageKey } from './messages'
import type { RouteCategory } from '../types/route'

export const CATEGORY_KEYS: Record<RouteCategory, MessageKey> = {
  inner: 'categoryInner',
  inter: 'categoryInter',
  express: 'categoryExpress',
  night: 'categoryNight',
  special: 'categorySpecial',
  centralAxis: 'categoryCentralAxis',
}

export const CATEGORY_FULL_KEYS: Record<RouteCategory, MessageKey> = {
  inner: 'categoryInnerFull',
  inter: 'categoryInterFull',
  express: 'categoryExpressFull',
  night: 'categoryNightFull',
  special: 'categorySpecialFull',
  centralAxis: 'categoryCentralAxisFull',
}
