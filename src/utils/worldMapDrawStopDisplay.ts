import { getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { WorldMapDrawStop } from '../types/worldMapDraw'

export function formatDrawStopLabel(
  stop: WorldMapDrawStop,
  _index: number,
  locale: Locale,
): string {
  void _index
  const name = getPrimaryText(stop.name, locale)
  if (stop.seq != null) {
    return `${stop.seq}. ${name}`
  }
  return name
}
