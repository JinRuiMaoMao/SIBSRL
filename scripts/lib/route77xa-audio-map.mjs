export const ROUTE_77XA_AT_PREFIX = '77xa-at'

export const ROUTE_77XA_STOPS = [
  { name: { zh: '仙贝广场', en: 'Senpai Shopping Center' } },
  { name: { zh: '仙贝图书馆', en: 'Senpai Library' } },
  { name: { zh: '上湾街市', en: 'Sheung Bay Market' } },
  { name: { zh: '仙贝市政大厦', en: 'Senpai Municipal Services Building' } },
  { name: { zh: '亚历山教堂', en: 'Alexander Church' } },
  { name: { zh: '亚历山花园', en: 'Alexander Garden' } },
  { name: { zh: '仙贝市政大厦', en: 'Senpai Municipal Services Building' } },
  { name: { zh: '红石楼', en: 'Redstone House' } },
  { name: { zh: '仙贝酒店', en: 'Senpai Hotel' } },
  { name: { zh: '仙贝图书馆', en: 'Senpai Library' } },
  { name: { zh: '仙贝广场', en: 'Senpai Shopping Center' } },
]

const CURRENT_STOP_FILE_HINTS = {
  仙贝广场: ['仙贝广场', '仙貝廣場', 'Senpai Shopping Center'],
  仙贝图书馆: ['仙贝图书馆', '仙貝圖書館', 'Senpai Library'],
  上湾街市: ['上湾街市', '上灣街市', 'Sheung Bay Market'],
  仙贝市政大厦: ['仙贝市政大厦', '仙貝市政大廈', 'Senpai Municipal Services Building'],
  亚历山教堂: ['亚历山教堂', '亞歷山教堂', 'Alexander Church'],
  亚历山花园: ['亚历山花园', '亞歷山花園', 'Alexander Garden'],
  红石楼: ['红石楼', '紅石樓', 'Redstone House', '紅石屋', '红石屋'],
  仙贝酒店: ['仙贝酒店', '仙貝酒店', 'Senpai Hotel'],
}

const SPECIAL_AT_STOP = {
  // 末站可用「下车提醒」或第二个「仙贝广场」
  10: ['下车提醒', '落車提示', 'alight', '仙贝广场2', '仙貝廣場2', 'Senpai Shopping Center 2'],
}

function matchSourceFile(hints, sourceNames) {
  for (const hint of hints) {
    if (!hint) continue
    for (const name of sourceNames) {
      if (name.includes(hint)) return name
    }
  }
  return null
}

function passIndexForRepeatedStop(stopList, nextIndex, nextZh, nextEn) {
  let pass = 0
  for (let i = 0; i < nextIndex; i++) {
    const s = stopList[i]
    if (nextZh && s.name.zh === nextZh) pass++
    else if (nextEn && s.name.en === nextEn) pass++
  }
  return pass
}

function hintsForCurrentStop(currentZh, currentEn, passIndex) {
  if (currentZh === '仙贝市政大厦' || currentEn === 'Senpai Municipal Services Building') {
    return passIndex === 0
      ? ['市政大厦1', '市政大廈1', '市政大厦', ...CURRENT_STOP_FILE_HINTS['仙贝市政大厦']]
      : ['市政大厦2', '市政大廈2', '市政大厦', ...CURRENT_STOP_FILE_HINTS['仙贝市政大厦']]
  }
  if (currentZh === '仙贝图书馆' || currentEn === 'Senpai Library') {
    return passIndex === 0
      ? ['图书馆1', '圖書館1', '图书馆', ...CURRENT_STOP_FILE_HINTS['仙贝图书馆']]
      : ['图书馆2', '圖書館2', '图书馆', ...CURRENT_STOP_FILE_HINTS['仙贝图书馆']]
  }
  if (currentZh === '仙贝广场' || currentEn === 'Senpai Shopping Center') {
    return passIndex === 0
      ? ['仙贝广场1', '仙貝廣場1', ...CURRENT_STOP_FILE_HINTS['仙贝广场']]
      : ['仙贝广场2', '仙貝廣場2', ...CURRENT_STOP_FILE_HINTS['仙贝广场']]
  }
  if (currentZh && CURRENT_STOP_FILE_HINTS[currentZh]) return CURRENT_STOP_FILE_HINTS[currentZh]
  if (currentZh) return [currentZh]
  if (currentEn) return [currentEn]
  return []
}

export function buildRoute77XAStopAudioSlots(stopList, sourceFileNames) {
  const slots = []

  for (let at = 0; at < stopList.length; at++) {
    const special = SPECIAL_AT_STOP[at]
    let source = null
    let nextIndex = at + 1
    let nextStop = stopList[nextIndex]

    if (special) {
      source = matchSourceFile(special, sourceFileNames)
      if (!nextStop) {
        nextStop = stopList[at]
        nextIndex = at
      }
    } else if (nextStop) {
      const current = stopList[at]
      const currentZh = current?.name.zh ?? ''
      const currentEn = current?.name.en ?? ''
      const pass = passIndexForRepeatedStop(stopList, at, currentZh, currentEn)
      const hints = hintsForCurrentStop(currentZh, currentEn, pass)
      source = matchSourceFile(hints, sourceFileNames)
    }

    if (!source || !nextStop) continue

    slots.push({
      atStopIndex: at,
      nextStopIndex: nextIndex + 1,
      nextStopLabel: nextStop.name,
      sourceFile: source,
    })
  }

  return slots
}
