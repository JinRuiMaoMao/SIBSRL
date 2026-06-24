import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findSibsAudioRoot } from './lib/sibs-audio-root.mjs'
import { routeIdToPageFilename } from './lib/route-page-filename-decode.mjs'
import { ROUTE_MAP_CANONICAL_IDS, ROUTE_MAP_ROUTE_ALIASES } from './build-route-maps-manifest.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const destRoot = resolve(root, 'public', 'route-maps')

const SOURCE_KINDS = [
  { kind: 'path', names: ['path', '走向', '走向图', 'alignment', 'route-path'] },
  { kind: 'height', names: ['height', '高度', '高度图', 'elevation', 'route-height'] },
]

const IMAGE_EXTENSIONS = ['.png', '.webp', '.jpg', '.jpeg']

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function copyIfExists(src, dest) {
  if (!existsSync(src)) return false
  ensureDir(resolve(dest, '..'))
  copyFileSync(src, dest)
  return true
}

function findImageFile(dir, names) {
  if (!existsSync(dir)) return null
  for (const name of names) {
    for (const ext of IMAGE_EXTENSIONS) {
      const file = join(dir, `${name}${ext}`)
      if (existsSync(file)) return file
    }
  }
  return null
}

function syncRouteFromDir(routeId, sourceDir) {
  let copied = 0
  const destDir = join(destRoot, routeIdToPageFilename(routeId))
  for (const { kind, names } of SOURCE_KINDS) {
    const src = findImageFile(sourceDir, names)
    if (!src) continue
    const ext = src.slice(src.lastIndexOf('.'))
    const dest = join(destDir, `${kind}${ext}`)
    if (copyIfExists(src, dest)) copied += 1
  }
  return copied
}

function collectRouteDirs(baseDir) {
  if (!existsSync(baseDir)) return []
  return readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ routeId: entry.name, dir: join(baseDir, entry.name) }))
}

function resolveCanonicalRouteMapId(folderName) {
  if (ROUTE_MAP_CANONICAL_IDS.includes(folderName)) return folderName
  const aliased = ROUTE_MAP_ROUTE_ALIASES[folderName]
  if (aliased && ROUTE_MAP_CANONICAL_IDS.includes(aliased)) return aliased
  return null
}

/** E:\\SIBS资源\\77XA、21A 等与广播资源同级的线路目录 */
function syncPerRouteFoldersUnderRoot(sibsRoot) {
  let copied = 0
  let routes = 0
  for (const entry of readdirSync(sibsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const canonicalId = resolveCanonicalRouteMapId(entry.name)
    if (!canonicalId) continue
    const count = syncRouteFromDir(canonicalId, join(sibsRoot, entry.name))
    if (count > 0) {
      copied += count
      routes += 1
    }
  }
  return { copied, routes }
}

function collectFlatFiles(baseDir) {
  if (!existsSync(baseDir)) return []
  const routes = new Map()
  for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const lower = entry.name.toLowerCase()
    if (!IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) continue
    const stem = entry.name.slice(0, entry.name.lastIndexOf('.'))
    for (const { kind, names } of SOURCE_KINDS) {
      for (const name of names) {
        if (stem === name || stem.endsWith(name)) {
          const routeId = stem.slice(0, stem.length - name.length) || stem
          if (!routes.has(routeId)) routes.set(routeId, { routeId, files: {} })
          routes.get(routeId).files[kind] = join(baseDir, entry.name)
        }
      }
    }
  }
  return [...routes.values()]
}

export function syncRouteMapImages(options = {}) {
  const sibsRoot = options.sibsRoot ?? findSibsAudioRoot()
  if (!sibsRoot) {
    console.warn('未找到 SIBS 资源根目录（E:\\SIBS资源 等），跳过线路走向/高度图同步')
    return { copied: 0, routes: 0 }
  }

  ensureDir(destRoot)

  const candidateDirs = [
    join(sibsRoot, 'route-maps'),
    join(sibsRoot, '线路图'),
    join(sibsRoot, '线路走向高度'),
    join(sibsRoot, '线路走向'),
  ]

  let copied = 0
  let routes = 0

  for (const baseDir of candidateDirs) {
    if (!existsSync(baseDir)) continue
    const perRouteDirs = collectRouteDirs(baseDir)
    if (perRouteDirs.length > 0) {
      for (const { routeId, dir } of perRouteDirs) {
        if (!ROUTE_MAP_CANONICAL_IDS.includes(routeId)) continue
        const count = syncRouteFromDir(routeId, dir)
        if (count > 0) {
          copied += count
          routes += 1
        }
      }
      continue
    }

    if (!statSync(baseDir).isDirectory()) continue
    for (const entry of collectFlatFiles(baseDir)) {
      if (!ROUTE_MAP_CANONICAL_IDS.includes(entry.routeId)) continue
      const destDir = join(destRoot, routeIdToPageFilename(entry.routeId))
      let count = 0
      for (const [kind, src] of Object.entries(entry.files)) {
        const ext = src.slice(src.lastIndexOf('.'))
        if (copyIfExists(src, join(destDir, `${kind}${ext}`))) count += 1
      }
      if (count > 0) {
        copied += count
        routes += 1
      }
    }
  }

  const fromRouteDirs = syncPerRouteFoldersUnderRoot(sibsRoot)
  copied += fromRouteDirs.copied
  routes += fromRouteDirs.routes

  if (copied > 0) {
    console.log(`[route-maps] 已同步 ${copied} 张图（${routes} 条线路）→ public/route-maps/`)
  } else {
    console.warn(
      `[route-maps] 未在 ${sibsRoot} 找到走向/高度图（期望 route-maps/<线路>/path.png 或 走向.png）`,
    )
  }

  return { copied, routes }
}

const isMain = process.argv[1]?.endsWith('sync-route-map-images.mjs')
if (isMain) {
  syncRouteMapImages()
}
