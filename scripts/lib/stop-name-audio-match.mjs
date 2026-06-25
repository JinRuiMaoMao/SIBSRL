/** 文件名 / 站名别名，用于站名 ↔ MP3 自动匹配（21A 池：文件名=下一站；N171 等：文件名=当前站） */

export const STOP_NAME_ALIASES = {
  'Dove Estate': ['白鸽邨'],
  'Dove Hill': ['白鸽山'],
  'Third Technology Building': ['三哥大厦'],
  'Wright Shopping Center': ['赖德商场', '赖得商场'],
  'Timelapse Mall': ['时间廊'],
  'Wright Lane': ['赖德里', '赖得里'],
  'Addi Road': ['艾迪路'],
  'Roblox HQ': ['RBXHQ', '总部大楼', '路博斯总部大楼'],
  'Dove Fire Station': ['白鸽消防局', '消防局'],
  'Eddie City': ['伊迪城'],
  'Addi City': ['艾迪城'],
  'Basketball Court': ['篮球场'],
  'Roblox TV': ['RBX TV', '阿周电视'],
  'Western Hospital': ['西区医院'],
  'Bank Tower': ['银行大厦'],
  'Alexander Garden': ['亚历山花园', '亚历山大花园'],
  'Alexander Church': ['亚历山教堂', '亚历山大教堂'],
  'Leafy Walking Trail': ['叶欣径', '叶欣俓'],
  'The ONE': ['THE ONE'],
  'Wright Station': ['赖得站'],
  'East Door Estate': ['东门下邨'],
  'Culture Square': ['文化广场'],
  'Regional Pier': ['国际码头'],
  'N Park': ['百彩新城'],
  'Sunshine Pier': ['阳光码头'],
  'Sunshine University': ['阳光大学'],
  'Sunshine Funeral Home': ['阳光殡仪馆'],
  'Long Island Ferry Pier': ['长岛码头'],
  'Long Island East Hospital': ['长岛东医院'],
  'Long Island Promenade': ['长岛海滨长廊'],
  'Zone 7 Interchange': ['第七区转车站'],
  'West Harbour Tunnel Interchange': ['西区海底隧道转车站'],
  'Leafy University': ['叶角大学'],
  'Leafy Bay Estate': ['叶角湾邨'],
  'Leafy Garden': ['叶角花园'],
  'North Leafy Garden': ['北叶花园'],
  'North Island Estate': ['北岛花园'],
  'North Island Estate Shopping Centre': ['北岛花园商场'],
  'Central Hospital': ['中环医院'],
  'Central Bridge': ['中环桥'],
  'Central South': ['中环南总站'],
  'Senpai Hill': ['仙贝山'],
  'Senpai Multi-storey Car Park': ['仙贝多层停车场'],
  'East Door Garden': ['东门花园'],
  'East Door Park': ['东门公园'],
  'East Door Bus Terminus': ['东门总站'],
  'East Factory': ['东厂'],
  'Diamond Trading Tower': ['钻石交易塔'],
  'Art Building': ['艺术大厦'],
  'Shopping Arcade': ['购物廊'],
  'Haisey Corner': ['海西角'],
  'Haisey Estate': ['海西邨'],
  'Glass House': ['玻璃楼'],
  'Neon Center': ['彩色汇'],
  'Timelapse': ['时间里'],
  'Panorama Heights': ['望环台'],
  'Maple Lane': ['枫树里'],
  'Strongwell Market': ['强生街市'],
  'North Norton Swimming Pool': ['北顿游泳池'],
  'Southern Cultural District Park': ['南环文化区公园'],
  'Southern Garden Phase 2': ['南环花园二期'],
  'Southern Sports Ground': ['南环运动场'],
  'Leafy Park': ['叶欣公园'],
  'Leafy Police Station': ['叶欣警察局'],
  'Leafy Estate Block 1': ['叶欣邨第一座'],
  'Leafy Estate Block 4': ['叶欣邨第四座'],
  'Rolisa Garden Phase 1': ['罗力素花园一期'],
  'Rolisa Garden Phase 2': ['罗力素花园二期'],
  'Leafy-Central Tunnel Admin Building': ['中叶隧道行政大楼'],
  'FT Bus Depot': ['际巴车厂'],
}

const ALIGHTING_HINTS = ['下车提醒', '落車提示', '落车提示', 'alight']

/** @typedef {'n' | 's' | 'e' | 'w'} DirectionAudioKey */

/** @type {{ pattern: RegExp, key: DirectionAudioKey }[]} */
const DIRECTION_TAG_PATTERNS = [
  { pattern: /（北行）$/, key: 'n' },
  { pattern: /（南行）$/, key: 's' },
  { pattern: /（东行）$/, key: 'e' },
  { pattern: /（西行）$/, key: 'w' },
]

/**
 * @param {string} body
 * @returns {{ body: string, directionTag: DirectionAudioKey | null }}
 */
function splitDirectionTag(body) {
  for (const { pattern, key } of DIRECTION_TAG_PATTERNS) {
    if (pattern.test(body)) {
      return { body: body.replace(pattern, '').trim(), directionTag: key }
    }
  }
  return { body, directionTag: null }
}

/** @param {DirectionAudioKey | null | undefined} directionTag @param {DirectionAudioKey | undefined} directionKey */
function directionTagMatches(directionTag, directionKey) {
  if (!directionKey) return true
  if (directionTag == null) return directionKey === 'n' || directionKey === 'e'
  return directionTag === directionKey
}

/** @param {string} filename */
export function parseMp3StopHint(filename) {
  const stem = filename.replace(/\.mp3$/i, '')
  let body = stem.replace(/^\d+[A-Za-z#%*]*路/, '').replace(/^77XA/i, '').replace(/^N171\s*/i, '').trim()

  if (!body) return null
  if (ALIGHTING_HINTS.some((hint) => body.includes(hint))) {
    return { kind: 'alight', hint: '下车提醒', passSuffix: null, directionTag: null }
  }

  const tagged = splitDirectionTag(body)
  body = tagged.body

  const numbered = body.match(/^(.+?)(\d+)$/)
  if (numbered) {
    return {
      kind: 'stop',
      hint: numbered[1],
      passSuffix: Number.parseInt(numbered[2], 10),
      directionTag: tagged.directionTag,
    }
  }

  return { kind: 'stop', hint: body, passSuffix: null, directionTag: tagged.directionTag }
}

/** @param {{ zh?: string, en?: string }} stopName @param {string} hint */
export function stopNameMatchesHint(stopName, hint) {
  const zh = stopName.zh?.trim() ?? ''
  const en = stopName.en?.trim() ?? ''
  const normalizedHint = hint.trim()
  if (!normalizedHint) return false

  if (zh && (zh === normalizedHint || zh.includes(normalizedHint) || normalizedHint.includes(zh))) {
    return true
  }

  if (en && (en === normalizedHint || en.includes(normalizedHint) || normalizedHint.includes(en))) {
    return true
  }

  const aliases = STOP_NAME_ALIASES[en] ?? []
  return aliases.some(
    (alias) =>
      alias === normalizedHint ||
      alias.includes(normalizedHint) ||
      normalizedHint.includes(alias),
  )
}

/**
 * @param {{ zh?: string, en?: string }} a
 * @param {{ zh?: string, en?: string }} b
 */
export function stopNamesReferToSamePlace(a, b) {
  const aZh = a.zh?.trim() ?? ''
  const bZh = b.zh?.trim() ?? ''
  const aEn = a.en?.trim() ?? ''
  const bEn = b.en?.trim() ?? ''

  if (aZh && bZh && aZh === bZh) return true
  if (aEn && bEn && aEn === bEn) return true
  if (aEn && stopNameMatchesHint(b, aEn)) return true
  if (bEn && stopNameMatchesHint(a, bEn)) return true
  if (aZh && stopNameMatchesHint(b, aZh)) return true
  if (bZh && stopNameMatchesHint(a, bZh)) return true
  return false
}

/**
 * @param {{ name: { zh?: string, en?: string } }[]} stopList
 * @param {{ name: { zh?: string, en?: string } }} stop
 */
export function findStopRowIndex(stopList, stop) {
  return stopList.findIndex((row) => stopNamesReferToSamePlace(row.name, stop.name))
}

/**
 * @param {{ name: { zh?: string, en?: string } }} stop
 * @param {number} passIndex 同名站在站序中第几次出现（0 起）
 * @param {string[]} sourceFileNames
 * @param {{ directionKey?: DirectionAudioKey, requireDirectionTag?: boolean }} [options]
 */
export function matchStopNameMp3(stop, passIndex, sourceFileNames, options = {}) {
  const { directionKey, requireDirectionTag = false } = options
  const candidates = []

  for (const file of sourceFileNames) {
    const parsed = parseMp3StopHint(file)
    if (!parsed || parsed.kind === 'alight') continue
    if (requireDirectionTag && parsed.directionTag == null) continue
    if (!directionTagMatches(parsed.directionTag, directionKey)) continue
    if (!stopNameMatchesHint(stop.name, parsed.hint)) continue
    candidates.push({ file, passSuffix: parsed.passSuffix, directionTag: parsed.directionTag })
  }

  if (candidates.length === 0) return null

  const desiredPass = passIndex + 1
  const exactPass = candidates.find((c) => c.passSuffix === desiredPass)
  if (exactPass) return exactPass.file

  const noSuffix = candidates.find((c) => c.passSuffix == null)
  if (noSuffix) return noSuffix.file

  if (candidates.length === 1) return candidates[0].file

  const fallback = candidates.find((c) => c.passSuffix === 1) ?? candidates[0]
  return fallback?.file ?? null
}

/**
 * 南行/西行等：优先方向专用文件；否则用对向站序镜像匹配默认方向音频池。
 * @param {{ name: { zh?: string, en?: string } }} current
 * @param {{ name: { zh?: string, en?: string } }} nextStop
 * @param {number} passIndex
 * @param {string[]} sourceFileNames
 * @param {{ name: { zh?: string, en?: string } }[]} mirrorStopList
 * @param {DirectionAudioKey} directionKey
 */
export function matchMirrorDirectionCurrentStopMp3(
  current,
  nextStop,
  passIndex,
  sourceFileNames,
  mirrorStopList,
  directionKey = 's',
) {
  const poolDirectionKey = directionKey === 'w' ? 'e' : 'n'

  const tagged = matchStopNameMp3(current, passIndex, sourceFileNames, {
    directionKey,
    requireDirectionTag: true,
  })
  if (tagged) return tagged

  const mirrorNextIndex = findStopRowIndex(mirrorStopList, nextStop)
  if (mirrorNextIndex <= 0) return null

  const mirrorCurrent = mirrorStopList[mirrorNextIndex - 1]
  const mirrorPass = passIndexForStopAtRow(mirrorStopList, mirrorNextIndex - 1)
  return matchStopNameMp3(mirrorCurrent, mirrorPass, sourceFileNames, {
    directionKey: poolDirectionKey,
  })
}

/** @deprecated Use matchStopNameMp3 */
export function matchNextStopMp3(nextStop, passIndex, sourceFileNames) {
  return matchStopNameMp3(nextStop, passIndex, sourceFileNames)
}

/**
 * @param {{ name: { zh?: string, en?: string } }[]} stopList
 * @param {number} atIndex
 */
export function passIndexForStopAtRow(stopList, atIndex) {
  const current = stopList[atIndex]
  if (!current) return 0
  const currentZh = current.name.zh
  const currentEn = current.name.en
  let pass = 0
  for (let i = 0; i < atIndex; i++) {
    const s = stopList[i]
    if (currentZh && s.name.zh === currentZh) pass++
    else if (currentEn && s.name.en === currentEn) pass++
  }
  return pass
}

/**
 * @param {{ name: { zh?: string, en?: string } }[]} stopList
 * @param {number} nextIndex
 */
export function passIndexForNextStop(stopList, nextIndex) {
  const next = stopList[nextIndex]
  if (!next) return 0
  const nextZh = next.name.zh
  const nextEn = next.name.en
  let pass = 0
  for (let i = 0; i < nextIndex; i++) {
    const s = stopList[i]
    if (nextZh && s.name.zh === nextZh) pass++
    else if (nextEn && s.name.en === nextEn) pass++
  }
  return pass
}

/**
 * @param {{ name: { zh?: string, en?: string } }[]} stopList
 * @param {string[]} sourceFileNames
 */
export function buildNextStopAudioSlots(stopList, sourceFileNames) {
  const slots = []

  for (let at = 0; at < stopList.length; at++) {
    const nextIndex = at + 1
    const nextStop = stopList[nextIndex]
    if (!nextStop) continue

    const pass = passIndexForNextStop(stopList, nextIndex)
    const source = matchStopNameMp3(nextStop, pass, sourceFileNames)
    if (!source) continue

    slots.push({
      atStopIndex: at,
      nextStopLabel: nextStop.name,
      sourceFile: source,
    })
  }

  return slots
}

/**
 * 文件名 = 当前站名，音频内容报下一站（N171、77XA 等复用音频池时使用）。
 * @param {{ name: { zh?: string, en?: string } }[]} stopList
 * @param {string[]} sourceFileNames
 * @param {{ directionKey?: DirectionAudioKey, mirrorStopList?: { name: { zh?: string, en?: string } }[] }} [options]
 */
export function buildCurrentStopAudioSlots(stopList, sourceFileNames, options = {}) {
  const { directionKey, mirrorStopList } = options
  const slots = []

  for (let at = 0; at < stopList.length; at++) {
    const current = stopList[at]
    const nextStop = stopList[at + 1]
    if (!nextStop) continue

    const pass = passIndexForStopAtRow(stopList, at)
    let source = null

    if ((directionKey === 's' || directionKey === 'w') && mirrorStopList?.length) {
      source = matchMirrorDirectionCurrentStopMp3(
        current,
        nextStop,
        pass,
        sourceFileNames,
        mirrorStopList,
        directionKey,
      )
    } else {
      source = matchStopNameMp3(current, pass, sourceFileNames, { directionKey: directionKey ?? 'n' })
    }

    if (!source) continue

    slots.push({
      atStopIndex: at,
      nextStopLabel: nextStop.name,
      sourceFile: source,
    })
  }

  return slots
}
