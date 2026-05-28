import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildRoute21AStopAudioSlots,
  ROUTE_21A_AT_PREFIX,
  ROUTE_21A_STOPS,
} from './lib/route21a-audio-map.mjs'
import {
  buildRoute77XAStopAudioSlots,
  ROUTE_77XA_AT_PREFIX,
  ROUTE_77XA_STOPS,
} from './lib/route77xa-audio-map.mjs'

/** 已录入线路报站音频的 routeId */
export const ROUTE_BROADCAST_IDS = ['21A', '77XA']
const ROUTE_21A_ID = '21A'
const ROUTE_77XA_ID = '77XA'

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

function resolveRouteSourceDir(root, routeId) {
  const candidates = [
    routeId,
    routeId.toUpperCase(),
    routeId.toLowerCase(),
    join('REBC', routeId),
    join('线路', routeId),
    routeId.replace(/A$/i, ''),
    join('REBC', routeId.replace(/A$/i, '')),
  ]
  for (const name of candidates) {
    const dir = join(root, name)
    if (existsSync(dir)) return dir
  }
  return null
}

function syncRoute21A(srcDir, destDir) {
  const sourceFiles = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.mp3'))
  const slots = buildRoute21AStopAudioSlots(ROUTE_21A_STOPS, sourceFiles)
  mkdirSync(destDir, { recursive: true })

  let copied = 0
  for (const slot of slots) {
    const destName = `${ROUTE_21A_AT_PREFIX}-${String(slot.atStopIndex).padStart(2, '0')}.mp3`
    copyFileSync(join(srcDir, slot.sourceFile), join(destDir, destName))
    copied++
  }
  return { copied, slots }
}

function syncRoute77XA(srcDir, destDir) {
  const sourceFiles = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.mp3'))
  const slots = buildRoute77XAStopAudioSlots(ROUTE_77XA_STOPS, sourceFiles)
  mkdirSync(destDir, { recursive: true })

  let copied = 0
  for (const slot of slots) {
    const destName = `${ROUTE_77XA_AT_PREFIX}-${String(slot.atStopIndex).padStart(2, '0')}.mp3`
    copyFileSync(join(srcDir, slot.sourceFile), join(destDir, destName))
    copied++
  }
  return { copied, slots, sourceCount: sourceFiles.length }
}

export function syncRouteBroadcastAudio(options = {}) {
  const root = options.root ?? findSibsBroadcastRoot()
  const routeIds = options.routeIds ?? ROUTE_BROADCAST_IDS
  const results = []

  if (!root) {
    console.warn('未找到 SIBS 广播根目录，跳过线路报站音频同步')
    return results
  }

  for (const routeId of routeIds) {
    const srcDir = resolveRouteSourceDir(root, routeId)
    const destDir = resolve('public', 'audio', 'routes', routeId)

    if (!srcDir) {
      console.warn(`${routeId} 报站：未找到源目录（请在 ${root}\\${routeId} 放入 MP3）`)
      results.push({ routeId, srcDir: null, destDir, count: 0 })
      continue
    }

    if (routeId === ROUTE_21A_ID) {
      const { copied, slots } = syncRoute21A(srcDir, destDir)
      console.log(`${routeId} 报站：${copied} 个（按「当前站 → 下一站」）→ ${destDir}`)
      for (const s of slots) {
        const at = ROUTE_21A_STOPS[s.atStopIndex]
        const atName = at.name.zh || at.name.en
        console.log(`  [${s.atStopIndex + 1}] ${atName} → ${s.sourceFile}`)
      }
      results.push({ routeId, srcDir, destDir, count: copied, slots })
    } else if (routeId === ROUTE_77XA_ID) {
      const { copied, slots, sourceCount } = syncRoute77XA(srcDir, destDir)
      if (sourceCount === 0) {
        console.warn(`${routeId} 报站：源目录为空（${srcDir}），请先放入 MP3`)
      } else {
        console.log(`${routeId} 报站：${copied} 个（按「当前站 → 下一站」）→ ${destDir}`)
        for (const s of slots) {
          const at = ROUTE_77XA_STOPS[s.atStopIndex]
          const atName = at.name.zh || at.name.en
          console.log(`  [${s.atStopIndex + 1}] ${atName} → ${s.sourceFile}`)
        }
      }
      results.push({ routeId, srcDir, destDir, count: copied, slots })
    } else {
      results.push({ routeId, srcDir, destDir, count: 0 })
    }
  }

  return results
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  syncRouteBroadcastAudio()
}
