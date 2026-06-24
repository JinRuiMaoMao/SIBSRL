import type { BilingualText } from '../types/route'
import type { RouteStop } from '../types/route'

const TURNING_POINT_ZH_SUFFIX = '转折点'

export interface ResolvedStopDisplay {
  name: BilingualText
  nameSub?: BilingualText
  turningPoint: boolean
}

export function stripTurningPointSuffix(text: string): {
  main: string
  turningPoint: boolean
} {
  const trimmed = text.trim()
  if (trimmed.endsWith(TURNING_POINT_ZH_SUFFIX)) {
    return {
      main: trimmed.slice(0, -TURNING_POINT_ZH_SUFFIX.length).trimEnd(),
      turningPoint: true,
    }
  }
  return { main: trimmed, turningPoint: false }
}

/** 解析站名：转折点不算站名，由 turningPoint 标记或中文后缀识别 */
export function resolveStopDisplay(
  stop: Pick<RouteStop, 'name' | 'nameSub' | 'turningPoint'>,
): ResolvedStopDisplay {
  if (stop.turningPoint) {
    return {
      name: stop.name,
      nameSub: stop.nameSub,
      turningPoint: true,
    }
  }

  const zh = stripTurningPointSuffix(stop.name.zh)
  if (zh.turningPoint) {
    return {
      name: { zh: zh.main, en: stop.name.en },
      nameSub: stop.nameSub,
      turningPoint: true,
    }
  }

  return {
    name: stop.name,
    nameSub: stop.nameSub,
    turningPoint: false,
  }
}

export function resolveMatchedStopDisplay(stop: {
  zh: string
  en: string
}): { label: string; turningPoint: boolean } {
  const zh = stripTurningPointSuffix(stop.zh)
  const label =
    stop.zh && stop.en
      ? stop.zh.endsWith(TURNING_POINT_ZH_SUFFIX)
        ? zh.main || stop.en
        : stop.zh
      : stop.zh || stop.en
  return { label, turningPoint: zh.turningPoint }
}

export function textContainsTurningPointMarker(text: string): boolean {
  return text.includes(TURNING_POINT_ZH_SUFFIX)
}
