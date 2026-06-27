import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { findSibsAudioRoot } from './lib/sibs-audio-root.mjs'

const MAP_SOURCES = [
  { name: 'SIMapGerenal.png', dest: 'SIMapGerenal.png' },
  { name: 'SIMap.png', dest: 'SIMap.png' },
]

export function syncWorldMapImages(options = {}) {
  const root = options.root ?? findSibsAudioRoot()
  const destDir = resolve(options.destDir ?? 'public', 'maps')
  mkdirSync(destDir, { recursive: true })

  if (!root) {
    console.warn('未找到 SIBS 资源根目录（E:\\SIBS资源 等），跳过群岛地图同步')
    return { copied: 0, destDir }
  }

  const mapDirCandidates = ['地图', '地图资源', 'maps', 'Maps']
  let mapDir = null
  for (const name of mapDirCandidates) {
    const candidate = join(root, name)
    if (existsSync(candidate)) {
      mapDir = candidate
      break
    }
  }

  if (!mapDir) {
    console.warn(`未找到地图目录（请在 ${root}\\地图 放入 SIMapGerenal.png / SIMap.png）`)
    return { copied: 0, destDir, root }
  }

  let copied = 0
  for (const { name, dest } of MAP_SOURCES) {
    const source = join(mapDir, name)
    const target = join(destDir, dest)
    if (!existsSync(source)) {
      console.warn(`未找到地图源文件：${source}`)
      continue
    }
    copyFileSync(source, target)
    console.log(`群岛地图：${source} → ${target}`)
    copied += 1
  }

  return { copied, destDir, root, mapDir }
}

const isMain = process.argv[1]?.endsWith('sync-world-map-images.mjs')
if (isMain) {
  syncWorldMapImages()
}
