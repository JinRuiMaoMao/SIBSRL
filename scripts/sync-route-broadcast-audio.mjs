import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findSibsAudioRoot } from './lib/sibs-audio-root.mjs'
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
import {
  buildStopNameAudioManifest,
  STOP_NAME_AUDIO_PUBLIC,
} from './build-stop-name-audio-manifest.mjs'
import {
  buildRouteDirectionAudioSlots,
  loadRouteStopGroups,
} from './lib/route-direction-audio-map.mjs'
import {
  discoverDirectionAudioRouteIds,
  resolveRouteSourceDir,
} from './lib/discover-direction-audio-routes.mjs'
import { buildRouteDirectionAudioManifest } from './build-route-direction-audio-manifest.mjs'

const ROUTE_21A_ID = '21A'
const ROUTE_77XA_ID = '77XA'
const SPECIAL_ROUTE_IDS = [ROUTE_21A_ID, ROUTE_77XA_ID]

/** @deprecated Use discoverDirectionAudioRouteIds — kept for scripts that import this list. */
export const ROUTE_BROADCAST_IDS = ['21A', '77XA', 'N171']

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

/** @param {string} routeId @param {string} srcDir @param {string} destDir */
function syncRouteDirectionAudio(routeId, srcDir, destDir) {
  const sourceFiles = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.mp3'))
  const groups = loadRouteStopGroups(routeId) ?? []
  const slots = buildRouteDirectionAudioSlots(routeId, sourceFiles)
  rmSync(destDir, { recursive: true, force: true })
  mkdirSync(destDir, { recursive: true })

  let copied = 0
  for (const slot of slots) {
    copyFileSync(join(srcDir, slot.sourceFile), join(destDir, slot.destName))
    copied++
  }
  return { copied, slots, sourceCount: sourceFiles.length, groups }
}

const ALIGHTING_REMINDER_SOURCE_HINTS = ['21路下车提醒', '下车提醒']
const ALIGHTING_REMINDER_DEST = resolve('public', 'audio', 'routes', 'common', 'alighting-reminder.mp3')

function syncStopNameAudioPool(srcDir) {
  const sourceFiles = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.mp3'))
  mkdirSync(STOP_NAME_AUDIO_PUBLIC, { recursive: true })

  let copied = 0
  for (const file of sourceFiles) {
    if (/下车提醒|落[车車]提示/i.test(file)) continue
    copyFileSync(join(srcDir, file), join(STOP_NAME_AUDIO_PUBLIC, file))
    copied++
  }
  return copied
}

function syncAlightingReminder(root) {
  const srcDir = resolveRouteSourceDir(root, ROUTE_21A_ID)
  if (!srcDir) {
    console.warn('通用下车提醒：未找到 21A 源目录')
    return false
  }

  const source = readdirSync(srcDir)
    .filter((f) => f.toLowerCase().endsWith('.mp3'))
    .find((f) => ALIGHTING_REMINDER_SOURCE_HINTS.some((hint) => f.includes(hint)))

  if (!source) {
    console.warn(`通用下车提醒：未在 ${srcDir} 找到 21路下车提醒.mp3`)
    return false
  }

  mkdirSync(resolve(ALIGHTING_REMINDER_DEST, '..'), { recursive: true })
  copyFileSync(join(srcDir, source), ALIGHTING_REMINDER_DEST)
  console.log(`通用下车提醒：${source} → ${ALIGHTING_REMINDER_DEST}`)
  return true
}

export function syncRouteBroadcastAudio(options = {}) {
  const root = options.root ?? findSibsAudioRoot()
  const directionRouteIds = root
    ? discoverDirectionAudioRouteIds(root, { exclude: SPECIAL_ROUTE_IDS })
    : []
  const routeIds =
    options.routeIds ?? [...SPECIAL_ROUTE_IDS, ...directionRouteIds]
  const results = []

  if (!root) {
    console.warn('未找到 SIBS 音频根目录（E:\\SIBS资源 等），跳过线路报站音频同步')
    return results
  }

  console.log(`线路报站音频源：${root}`)

  syncAlightingReminder(root)

  const poolSrcDir = resolveRouteSourceDir(root, ROUTE_21A_ID)
  if (poolSrcDir) {
    const poolCount = syncStopNameAudioPool(poolSrcDir)
    console.log(`站名报站池：${poolCount} 个（21A 目录，按下一站名匹配）→ ${STOP_NAME_AUDIO_PUBLIC}`)
    buildStopNameAudioManifest()
  } else {
    console.warn('站名报站池：未找到 21A 源目录，跳过')
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
    } else if (directionRouteIds.includes(routeId) || routeId === 'N171') {
      const { copied, slots, sourceCount, groups } = syncRouteDirectionAudio(routeId, srcDir, destDir)
      if (sourceCount === 0) {
        console.warn(`${routeId} 报站：源目录为空（${srcDir}），请先放入 MP3`)
      } else {
        console.log(`${routeId} 报站：${copied} 个（分方向，文件名=当前站）→ ${destDir}`)
        for (const s of slots) {
          const group = groups.find((g) => g.directionGroupIndex === s.directionGroupIndex)
          const atStop = group?.list[s.atStopIndex]
          const atName = atStop?.name.zh || atStop?.name.en || `#${s.atStopIndex + 1}`
          const nextName = s.nextStopLabel?.zh || s.nextStopLabel?.en || '?'
          console.log(
            `  [${s.directionKey.toUpperCase()} ${s.atStopIndex + 1}] ${atName} ← ${s.sourceFile} (报→ ${nextName})`,
          )
        }
      }
      results.push({ routeId, srcDir, destDir, count: copied, slots })
    } else {
      results.push({ routeId, srcDir, destDir, count: 0 })
    }
  }

  buildRouteDirectionAudioManifest()

  return results
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  syncRouteBroadcastAudio()
}
