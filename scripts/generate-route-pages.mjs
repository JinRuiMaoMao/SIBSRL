import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractRoutePageDataFromHtml } from './lib/extract-route-page-data.mjs'
import {
  getDisplayRouteIds,
  getPreservedRoutePagePaths,
  getSimpleDisplayRenames,
} from './lib/route-display-ids.mjs'
import {
  renderRouteAliasRedirectHtml,
  renderRoutePageHtml,
  routeIdToPageFilename,
} from './lib/route-page-html.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

function readRoutePagesManifest(manifestPath) {
  if (!existsSync(manifestPath)) return null
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

function hasSubjectTemplateStop(value) {
  if (typeof value === 'string') {
    return /(?:^|[\s,])subject\s*=/i.test(value)
  }

  if (!value || typeof value !== 'object') return false

  if (Array.isArray(value)) {
    return value.some(hasSubjectTemplateStop)
  }

  const name = value.name
  if (name && typeof name === 'object') {
    for (const text of Object.values(name)) {
      if (typeof text === 'string' && /^subject\s*=/i.test(text.trim())) return true
    }
  }

  return Object.values(value).some(hasSubjectTemplateStop)
}

function selectRoutePageData(id, preservedData, manifestData) {
  if (
    preservedData &&
    manifestData &&
    hasSubjectTemplateStop(preservedData) &&
    !hasSubjectTemplateStop(manifestData)
  ) {
    return { ...manifestData, id }
  }

  return { ...(preservedData ?? manifestData ?? {}), id }
}

/**
 * 为每条展示线路生成 routes/{id}.html（内嵌可编辑 JSON）
 * @param {{ targets?: string[], manifestPath?: string }} [options]
 */
export function generateRoutePages(options = {}) {
  const ids = getDisplayRouteIds()
  const manifestPath =
    options.manifestPath ??
    (existsSync(resolve(root, 'dist/route-pages-data.json'))
      ? resolve(root, 'dist/route-pages-data.json')
      : resolve(root, '.cache/route-pages-data.json'))

  const manifest = readRoutePagesManifest(manifestPath) ?? {}
  const targets = options.targets ?? [
    resolve(root, 'routes'),
    resolve(root, 'dist/routes'),
  ]

  const preserved = new Map()
  const rootRoutesDir = resolve(root, 'routes')
  if (existsSync(rootRoutesDir)) {
    for (const id of ids) {
      if (preserved.has(id)) continue
      for (const existingPath of getPreservedRoutePagePaths(id, rootRoutesDir)) {
        if (!existsSync(existingPath)) continue
        const data = extractRoutePageDataFromHtml(readFileSync(existingPath, 'utf8'))
        if (data) {
          preserved.set(id, data)
          break
        }
      }
    }
  }

  for (const dir of targets) {
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })

    for (const id of ids) {
      const routeData = selectRoutePageData(id, preserved.get(id), manifest[id])
      const filePath = resolve(dir, `${routeIdToPageFilename(id)}.html`)
      writeFileSync(filePath, renderRoutePageHtml(id, routeData), 'utf8')
    }

    for (const [alias, displayId] of getSimpleDisplayRenames()) {
      if (ids.includes(alias) || !ids.includes(displayId)) continue
      const aliasPath = resolve(dir, `${routeIdToPageFilename(alias)}.html`)
      writeFileSync(aliasPath, renderRouteAliasRedirectHtml(alias, displayId), 'utf8')
    }

    console.log(`[route-pages] 已生成 ${ids.length} 个页面 → ${dir}`)
  }

  return ids
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  generateRoutePages()
}
