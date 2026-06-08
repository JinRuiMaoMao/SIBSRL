import type { BusRoute } from '../types/route'

const PENDING_STOP_RE = /待补充|\(pending\)/i

function isPendingStopName(zh: string, en: string): boolean {
  return PENDING_STOP_RE.test(zh) || PENDING_STOP_RE.test(en)
}

/** 是否已录入真实站序（排除占位线路、合并合成的待补充站） */
export function isRouteStopDataComplete(route: BusRoute): boolean {
  if (!route.stops?.length) return false

  const allStops = route.stops.flatMap((group) => group.list)
  if (allStops.length === 0) return false

  if (allStops.some((stop) => isPendingStopName(stop.name.zh, stop.name.en))) {
    return false
  }

  if (route.origin.zh === '待补充' || route.origin.en === 'To be added') return false
  if (route.destination.zh === '待补充' || route.destination.en === 'To be added') return false

  const notes = `${route.notes?.zh ?? ''} ${route.notes?.en ?? ''}`
  if (/站点与服务资料待补充|Stops and service details pending/i.test(notes)) {
    return false
  }

  return true
}
