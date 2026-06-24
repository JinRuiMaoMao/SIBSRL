import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { findSibsAudioRoot, resolveSourceSubdir } from './lib/sibs-audio-root.mjs'
import { syncNpcAudio } from './sync-npc-audio.mjs'

function broadcastNumberFromFilename(file) {
  const base = file.replace(/\.mp3$/i, '')
  const match = base.match(/(\d+)\s*$/) ?? base.match(/(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
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

function copyMusicSet(srcDir, destDir) {
  if (!existsSync(srcDir)) return 0
  mkdirSync(destDir, { recursive: true })
  const files = readdirSync(srcDir).filter((f) => {
    const lower = f.toLowerCase()
    return lower.endsWith('.mp3') || lower.endsWith('.ogg')
  })

  const NAME_MAP = [
    { sourceIncludes: 'San Francisco Nights', dest: 'music-main-menu.ogg' },
    { sourceIncludes: '主界面', dest: 'music-main-menu.ogg' },
    { sourceIncludes: 'Radium', dest: 'music-map-menu.ogg' },
    { sourceIncludes: '地图界面', dest: 'music-map-menu.ogg' },
    { sourceIncludes: 'Shiawase', dest: 'music-spawn-01.ogg' },
    { sourceIncludes: '车辆生成1', dest: 'music-spawn-01.ogg' },
    { sourceIncludes: 'Daily Rush', dest: 'music-spawn-02.ogg' },
    { sourceIncludes: '车辆生成2', dest: 'music-spawn-02.ogg' },
    { sourceIncludes: 'Meltdown', dest: 'music-spawn-03.ogg' },
    { sourceIncludes: '车辆生成3', dest: 'music-spawn-03.ogg' },
    { sourceIncludes: 'Night Run', dest: 'music-spawn-04.ogg' },
    { sourceIncludes: '车辆生成4', dest: 'music-spawn-04.ogg' },
    { sourceIncludes: '结算1', dest: 'music-settlement-01.ogg' },
    { sourceIncludes: '结算2', dest: 'music-settlement-02.ogg' },
    { sourceIncludes: '结算3', dest: 'music-settlement-03.ogg' },
    { sourceIncludes: '结算后', dest: 'music-settlement-after.ogg' },
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

const root = findSibsAudioRoot()
if (!root) {
  console.warn('未找到 SIBS 音频根目录（E:\\SIBS资源 等），跳过音频同步')
  process.exit(0)
}

console.log(`音频源：${root}`)

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
const musicSrc = resolveSourceSubdir(root, ['音乐', '音樂', 'Music', 'music'])

const commonDest = resolve('public/audio/broadcasts/common')
const horizonDest = resolve('public/audio/broadcasts/horizon')
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
syncNpcAudio({ sibsRoot: root })
const musicCount = musicSrc ? copyMusicSet(musicSrc, musicDest) : 0

console.log(`通用广播：${commonCount} 个 → ${commonDest}`)
if (horizonSrc) {
  console.log(`Horizon Bus：${horizonCount} 个 → ${horizonDest}`)
} else {
  console.log('Horizon Bus：未找到源目录，跳过')
}
if (musicSrc) {
  console.log(`音乐：${musicCount} 个 → ${musicDest}`)
} else {
  console.log('音乐：未找到源目录，跳过')
}
