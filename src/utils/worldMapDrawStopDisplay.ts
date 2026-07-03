import { getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { WorldMapDrawStop } from '../types/worldMapDraw'

export function formatDrawStopLabel(
  stop: WorldMapDrawStop,
  index: number,
  locale: Locale,
): string {
  const name = getPrimaryText(stop.name, locale)
  return `${index + 1}. ${name}`
}
