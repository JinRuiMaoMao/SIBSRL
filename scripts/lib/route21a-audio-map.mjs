export const ROUTE_21A_AT_PREFIX = '21a-at'

export const ROUTE_21A_STOPS = [
  { name: { zh: '白鸽邨', en: 'Dove Estate' } },
  { name: { zh: '白鸽山', en: 'Dove Hill' } },
  { name: { zh: '三哥大厦', en: 'Third Technology Building' } },
  { name: { zh: '赖得商场', en: 'Wright Shopping Center' } },
  { name: { zh: '时间廊', en: 'Timelapse Mall' } },
  { name: { zh: '赖得里', en: 'Wright Lane' } },
  { name: { zh: '艾迪路', en: 'Addi Road' } },
  { name: { zh: '路博斯总部大楼', en: 'Roblox HQ' } },
  { name: { zh: '白鸽消防局', en: 'Dove Fire Station' } },
  { name: { zh: '伊迪城', en: 'Eddie City' } },
  { name: { zh: '', en: 'Basketball Court' } },
  { name: { zh: '阿周电视', en: 'Roblox TV' } },
  { name: { zh: '西区医院', en: 'Western Hospital' } },
  { name: { zh: '艾迪城', en: 'Addi City' } },
  { name: { zh: '白鸽消防局', en: 'Dove Fire Station' } },
  { name: { zh: '路博斯总部大楼', en: 'Roblox HQ' } },
  { name: { zh: '银行大厦', en: 'Bank Tower' } },
  { name: { zh: '三哥大厦', en: 'Third Technology Building' } },
  { name: { zh: '白鸽山', en: 'Dove Hill' } },
  { name: { zh: '白鸽邨', en: 'Dove Estate' } },
]

const NEXT_STOP_FILE_HINTS = {
  三哥大厦: ['三哥大厦'],
  赖得商场: ['赖德商场', '赖得商场'],
  时间廊: ['时间廊'],
  赖得里: ['赖德里', '赖得里'],
  艾迪路: ['艾迪路'],
  路博斯总部大楼: ['RBXHQ', '总部大楼', '总部'],
  白鸽消防局: ['白鸽消防局', '消防局'],
  伊迪城: ['伊迪城'],
  篮球场: ['篮球场'],
  阿周电视: ['RBX TV', '阿周电视'],
  西区医院: ['西区医院'],
  /** 21路艾迪城.mp3（勿与 艾迪路 混用） */
  艾迪城: ['艾迪城'],
  银行大厦: ['银行大厦'],
  白鸽邨: ['白鸽邨'],
}

const SPECIAL_AT_STOP = {
  19: ['下车提醒'],
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

function hintsForNextStop(nextZh, nextEn, passIndex) {
  if (nextZh === '白鸽山' || nextEn === 'Dove Hill') {
    return passIndex === 0 ? ['白鸽山1'] : ['白鸽山2', '白鸽山1']
  }
  if (nextZh === '艾迪城' || nextEn === 'Addi City') {
    return ['艾迪城']
  }
  if (nextZh && NEXT_STOP_FILE_HINTS[nextZh]) return NEXT_STOP_FILE_HINTS[nextZh]
  if (nextEn === 'Basketball Court') return NEXT_STOP_FILE_HINTS['篮球场']
  if (nextEn === 'Roblox TV') return NEXT_STOP_FILE_HINTS['阿周电视']
  if (nextEn === 'Roblox HQ') return NEXT_STOP_FILE_HINTS['路博斯总部大楼']
  if (nextEn === 'Dove Estate') return NEXT_STOP_FILE_HINTS['白鸽邨']
  if (nextZh) return [nextZh]
  if (nextEn) return [nextEn]
  return []
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

export function buildRoute21AStopAudioSlots(stopList, sourceFileNames) {
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
      const nextZh = nextStop.name.zh
      const nextEn = nextStop.name.en
      const pass = passIndexForRepeatedStop(stopList, nextIndex, nextZh, nextEn)
      const hints = hintsForNextStop(nextZh, nextEn, pass)
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
