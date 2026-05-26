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

const commonDest = resolve('public/audio/broadcasts/common')
const horizonDest = resolve('public/audio/broadcasts/horizon')

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

console.log(`通用广播：${commonCount} 个 → ${commonDest}`)
if (horizonSrc) {
  console.log(`Horizon Bus：${horizonCount} 个 → ${horizonDest}`)
} else {
  console.log('Horizon Bus：未找到源目录，跳过')
}
