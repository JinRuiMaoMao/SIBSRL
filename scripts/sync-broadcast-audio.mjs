import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

function findSibsBroadcastRoot() {
  const candidates = ['E:\\SIBS广播', resolve('..', 'SIBS广播')]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  const eRoot = 'E:\\'
  if (!existsSync(eRoot)) return null
  for (const name of readdirSync(eRoot, { withFileTypes: true })) {
    if (!name.isDirectory() || name.name === 'sibsRouteLookupTool') continue
    if (!/SIBS/i.test(name.name) || !/广播/.test(name.name)) continue
    const root = join(eRoot, name.name)
    if (existsSync(root)) return root
  }
  return null
}

function broadcastNumberFromFilename(file) {
  const base = file.replace(/\.mp3$/i, '')
  const match = base.match(/(\d+)\s*$/) ?? base.match(/(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
}

function complaintTagFromFilename(file) {
  const lower = file.toLowerCase()
  // 手工录制文件无编号时的兜底映射
  if (lower.includes('ahhhhhhhhh') || /^ah+/.test(lower)) return { number: 7, category: 'driving' }
  if (lower.includes('whydidyou')) return { number: 9, category: 'driving' }
  if (file.includes('感谢') || lower.includes('thankyou')) return { number: 10, category: 'driving' }
  if (file.includes('没上车')) return { number: 11, category: 'alight' }
  return null
}

function copyMp3Set(srcDir, destDir, filePrefix) {
  if (!existsSync(srcDir)) return 0
  mkdirSync(destDir, { recursive: true })
  const files = readdirSync(srcDir)
    .filter((f) => f.toLowerCase().endsWith('.mp3'))
    .sort((a, b) => broadcastNumberFromFilename(a) - broadcastNumberFromFilename(b))

  let copied = 0
  for (const file of files) {
    const n = broadcastNumberFromFilename(file)
    if (!n) continue
    const destName = `${filePrefix}-${String(n).padStart(2, '0')}.mp3`
    copyFileSync(join(srcDir, file), join(destDir, destName))
    copied++
  }
  return copied
}

function copyComplaintMp3Set(srcDir, destDir) {
  if (!existsSync(srcDir)) return 0
  mkdirSync(destDir, { recursive: true })
  const files = readdirSync(srcDir)
    .filter((f) => {
      const lower = f.toLowerCase()
      return lower.endsWith('.mp3') || lower.endsWith('.ogg')
    })
    .sort((a, b) => broadcastNumberFromFilename(a) - broadcastNumberFromFilename(b))

  let copied = 0
  for (const file of files) {
    let n = broadcastNumberFromFilename(file)
    let isAlight = /下车抱怨/i.test(file) || /alight/i.test(file)
    if (!n) {
      const tag = complaintTagFromFilename(file)
      if (!tag) continue
      n = tag.number
      isAlight = tag.category === 'alight'
    }
    const destName = isAlight
      ? `alight-${String(n).padStart(2, '0')}.mp3`
      : `complaint-${String(n).padStart(2, '0')}.mp3`
    // 浏览器可直接播放 ogg；统一落地为 .mp3 文件名，复用前端映射
    copyFileSync(join(srcDir, file), join(destDir, destName))
    copied++
  }
  return copied
}

function copyMusicSet(srcDir, destDir) {
  if (!existsSync(srcDir)) return 0
  mkdirSync(destDir, { recursive: true })
  const files = readdirSync(srcDir).filter((f) => {
    const lower = f.toLowerCase()
    return lower.endsWith('.mp3') || lower.endsWith('.ogg')
  })

  const NAME_MAP = [
    { sourceIncludes: '主界面', dest: 'music-main-menu.ogg' },
    { sourceIncludes: '地图界面', dest: 'music-map-menu.ogg' },
    { sourceIncludes: '车辆生成1', dest: 'music-spawn-01.ogg' },
    { sourceIncludes: '车辆生成2', dest: 'music-spawn-02.ogg' },
    { sourceIncludes: '车辆生成3', dest: 'music-spawn-03.ogg' },
    { sourceIncludes: '结算1', dest: 'music-settlement-01.ogg' },
    { sourceIncludes: '结算2', dest: 'music-settlement-02.ogg' },
    { sourceIncludes: '结算3', dest: 'music-settlement-03.ogg' },
  ]

  let copied = 0
  for (const rule of NAME_MAP) {
    const source = files.find((f) => f.includes(rule.sourceIncludes))
    if (!source) continue
    copyFileSync(join(srcDir, source), join(destDir, rule.dest))
    copied++
  }
  return copied
}

function resolveSourceSubdir(root, names) {
  for (const name of names) {
    const dir = join(root, name)
    if (existsSync(dir)) return dir
  }
  return null
}

const root = findSibsBroadcastRoot()
if (!root) {
  console.warn('未找到 SIBS 广播根目录，跳过音频同步')
  process.exit(0)
}

const commonSrc =
  resolveSourceSubdir(root, ['通用', 'Common', 'FTCC', 'ftcc']) ?? join(root, 'FTCC')
const horizonSrc = resolveSourceSubdir(root, [
  'Horizon Bus',
  'Horizon',
  'HorizonBus',
  'HZ',
  'HG',
  'horizon',
])
const complaintsSrc = resolveSourceSubdir(root, ['抱怨', 'Complaints', 'Complaint', 'complaints'])
const musicSrc = resolveSourceSubdir(root, ['音乐', '音樂', 'Music', 'music'])

const commonDest = resolve('public/audio/broadcasts/common')
const horizonDest = resolve('public/audio/broadcasts/horizon')
const complaintsDest = resolve('public/audio/broadcasts/complaints')
const musicDest = resolve('public/audio/broadcasts/music')

/** 游戏编号 1–16，无 7（请勿阻塞通道） */
const EXPECTED_COMMON_NUMBERS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16]

const commonCount = copyMp3Set(commonSrc, commonDest, 'common')
if (commonCount > 0) {
  const missing = EXPECTED_COMMON_NUMBERS.filter(
    (n) => !existsSync(join(commonDest, `common-${String(n).padStart(2, '0')}.mp3`)),
  )
  if (missing.length) {
    console.warn(`通用广播缺少编号：${missing.join(', ')}（游戏无 7）`)
  }
}
const horizonCount = horizonSrc ? copyMp3Set(horizonSrc, horizonDest, 'horizon') : 0
const complaintsCount = complaintsSrc
  ? copyComplaintMp3Set(complaintsSrc, complaintsDest)
  : 0
const musicCount = musicSrc ? copyMusicSet(musicSrc, musicDest) : 0

console.log(`通用广播：${commonCount} 个 → ${commonDest}`)
if (horizonSrc) {
  console.log(`Horizon Bus：${horizonCount} 个 → ${horizonDest}`)
} else {
  console.log('Horizon Bus：未找到源目录，跳过')
}
if (complaintsSrc) {
  console.log(`抱怨广播：${complaintsCount} 个 → ${complaintsDest}`)
} else {
  console.log('抱怨广播：未找到源目录，跳过')
}
if (musicSrc) {
  console.log(`音乐：${musicCount} 个 → ${musicDest}`)
} else {
  console.log('音乐：未找到源目录，跳过')
}
