/** @param {unknown} stop */
export function readRoutePageStopName(stop) {
  if (!stop || typeof stop !== 'object') return null

  if ('name' in stop && stop.name && typeof stop.name === 'object') {
    const zh = (stop.name.zh ?? '').trim()
    const en = (stop.name.en ?? '').trim()
    if (zh || en) return { zh: zh || en, en: en || zh }
  }

  const zh = ('zh' in stop && typeof stop.zh === 'string' ? stop.zh : '').trim()
  const en = ('en' in stop && typeof stop.en === 'string' ? stop.en : '').trim()
  if (zh || en) return { zh: zh || en, en: en || zh }

  return null
}
