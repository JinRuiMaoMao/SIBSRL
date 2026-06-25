/** 文件名 / 站名别名，用于「下一站 ↔ MP3」自动匹配 */

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

/** @param {string} filename */
export function parseMp3StopHint(filename) {
  const stem = filename.replace(/\.mp3$/i, '')
  let body = stem.replace(/^\d+[A-Za-z#%*]*路/, '').replace(/^77XA/i, '').replace(/^N171\s*/i, '').trim()

  if (!body) return null
  if (ALIGHTING_HINTS.some((hint) => body.includes(hint))) {
    return { kind: 'alight', hint: '下车提醒', passSuffix: null }
  }

  const numbered = body.match(/^(.+?)(\d+)$/)
  if (numbered) {
    return {
      kind: 'stop',
      hint: numbered[1],
      passSuffix: Number.parseInt(numbered[2], 10),
    }
  }

  return { kind: 'stop', hint: body, passSuffix: null }
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
 * @param {{ name: { zh?: string, en?: string } }} nextStop
 * @param {number} passIndex 同名「下一站」在站序中第几次出现（0 起）
 * @param {string[]} sourceFileNames
 */
export function matchNextStopMp3(nextStop, passIndex, sourceFileNames) {
  const candidates = []

  for (const file of sourceFileNames) {
    const parsed = parseMp3StopHint(file)
    if (!parsed || parsed.kind === 'alight') continue
    if (!stopNameMatchesHint(nextStop.name, parsed.hint)) continue
    candidates.push({ file, passSuffix: parsed.passSuffix })
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
    const source = matchNextStopMp3(nextStop, pass, sourceFileNames)
    if (!source) continue

    slots.push({
      atStopIndex: at,
      nextStopLabel: nextStop.name,
      sourceFile: source,
    })
  }

  return slots
}
