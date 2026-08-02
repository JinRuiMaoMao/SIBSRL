import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  APP_PAGES,
  adjustAppPageTitle,
  injectAppTabMeta,
  injectDevToolsBlock,
  injectLocaleBootstrap,
  injectAccountPageMeta,
  injectMapDrawPageMeta,
  injectRouteMapPageMeta,
  injectSettingsPageMeta,
  injectNoScriptGuard,
  injectSecretPageMeta,
  injectServiceWorkerBootstrap,
  injectStartPageMeta,
  injectRealLayoutMusicEarlyBootstrap,
  injectThemeBootstrap,
  injectPortraitBlockBootstrap,
  injectPortraitOrientationFallback,
  injectAppSurfaceBootstrap,
  injectUserApiMeta,
  injectBootFailureGuard,
  injectSwVersionBootstrap,
  relocateAppBundleScript,
  syncFaviconLink,
  APP_LAYOUT_PUBLISH,
  prepareLayoutScopedHtml,
  buildLegacyLayoutRedirectHtml,
} from './lib/app-page-html.mjs'
import { injectStartBootSplash } from './lib/start-boot-splash.mjs'
import { generateRoutePages } from './generate-route-pages.mjs'
import { buildRouteDetailStops } from './build-route-detail-stops.mjs'
import { syncBrandAssets } from './sync-brand-assets.mjs'
import { syncCompanyLogos } from './sync-company-logos.mjs'
import { syncWorldMapImages } from './sync-world-map-images.mjs'
import { buildWorldMapRoutesManifest } from './build-world-map-routes-manifest.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const built = resolve(root, 'dist', 'dev.html')
const publicAudio = resolve(root, 'public', 'audio')
const distAudio = resolve(root, 'dist', 'audio')
const rootAudio = resolve(root, 'audio')

function readSwCacheVersion() {
  const swPath = resolve(root, 'public', 'sw.js')
  if (!existsSync(swPath)) return 'unknown'
  const match = readFileSync(swPath, 'utf8').match(/CACHE_VERSION = '([^']+)'/)
  return match?.[1] ?? 'unknown'
}

function prepareStandaloneHtml(html, buildTag) {
  let out = html
  if (!out.includes('name="app-build"')) {
    out = out.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="app-build" content="${buildTag}" />`,
    )
  } else {
    out = out.replace(
      /name="app-build" content="[^"]*"/,
      `name="app-build" content="${buildTag}"`,
    )
  }
  if (!out.includes('class="boot-hint"')) {
    out = out.replace(
      '<div id="root"></div>',
      '<div id="root"><p class="boot-hint">本站加载中…</p></div>',
    )
  }
  return out
}

/** @param {string} html @param {string} filename @param {string} siteRoot @param {string} distRoot @param {{ layouts?: Array<'normal' | 'real'> }} [options] */
function publishHtmlToLayoutDirs(html, filename, siteRoot, distRoot, options = {}) {
  const layouts = options.layouts ?? ['normal', 'real']
  for (const { dir, mode } of APP_LAYOUT_PUBLISH) {
    if (!layouts.includes(mode)) continue
    let scoped = prepareLayoutScopedHtml(html, mode, true)
    if (mode === 'real' && filename === 'routes.html') {
      scoped = injectRealLayoutMusicEarlyBootstrap(scoped)
    }
    const layoutDir = resolve(siteRoot, dir)
    const distLayoutDir = resolve(distRoot, dir)
    mkdirSync(layoutDir, { recursive: true })
    mkdirSync(distLayoutDir, { recursive: true })
    writeFileSync(resolve(layoutDir, filename), scoped)
    writeFileSync(resolve(distLayoutDir, filename), scoped)
  }
}

/** @param {string} filename @param {string} normalTargetPath e.g. normal/ann.html */
function writeRealRedirectToNormal(filename, normalTargetPath, siteRoot, distRoot) {
  const clean = normalTargetPath.replace(/^\.\//, '')
  const redirectHtml = buildLegacyLayoutRedirectHtml(`../${clean}`)
  for (const dir of ['real']) {
    mkdirSync(resolve(siteRoot, dir), { recursive: true })
    mkdirSync(resolve(distRoot, dir), { recursive: true })
    writeFileSync(resolve(siteRoot, dir, filename), redirectHtml)
    writeFileSync(resolve(distRoot, dir, filename), redirectHtml)
  }
}

/** @param {string} filename @param {string} targetPath @param {string} siteRoot @param {string} distRoot */
function writeLegacyRedirect(filename, targetPath, siteRoot, distRoot) {
  const redirectHtml = buildLegacyLayoutRedirectHtml(targetPath)
  writeFileSync(resolve(siteRoot, filename), redirectHtml)
  writeFileSync(resolve(distRoot, filename), redirectHtml)
}

/**
 * 将 dist/dev.html 同步为根目录各栏目 HTML（index / ann / music …）。
 * @param {{ buildTag?: string }} [options]
 */
export function publishStandalone(options = {}) {
  const buildTag = options.buildTag ?? new Date().toISOString()

  if (!existsSync(built)) {
    throw new Error('未找到 dist/dev.html，请先运行 vite build')
  }

  const baseHtml = relocateAppBundleScript(
    injectBootFailureGuard(
      injectServiceWorkerBootstrap(
        injectSwVersionBootstrap(
          injectAppSurfaceBootstrap(
            syncFaviconLink(
              injectUserApiMeta(
                injectLocaleBootstrap(
                  injectThemeBootstrap(
                    injectPortraitBlockBootstrap(
                      injectPortraitOrientationFallback(
                        injectDevToolsBlock(
                          injectNoScriptGuard(prepareStandaloneHtml(readFileSync(built, 'utf8'), buildTag)),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              buildTag,
            ),
          ),
          readSwCacheVersion(),
        ),
      ),
    ),
  )

  for (const page of APP_PAGES) {
    let html = injectAppTabMeta(baseHtml, page.tab)
    html = adjustAppPageTitle(html, page.titleZh)
    if (page.tab === 'routes') {
      publishHtmlToLayoutDirs(html, page.publishFile, root, resolve(root, 'dist'))
    } else {
      publishHtmlToLayoutDirs(html, page.publishFile, root, resolve(root, 'dist'), { layouts: ['normal'] })
      writeRealRedirectToNormal(page.publishFile, `normal/${page.publishFile}`, root, resolve(root, 'dist'))
    }
    writeLegacyRedirect(page.publishFile, `normal/${page.publishFile}`, root, resolve(root, 'dist'))
  }

  let startHtml = injectStartBootSplash(injectStartPageMeta(baseHtml))
  startHtml = adjustAppPageTitle(startHtml, '阳光群岛巴士线路查询', { standalone: true })
  writeFileSync(resolve(root, 'index.html'), startHtml)
  writeFileSync(resolve(root, 'dist', 'index.html'), startHtml)

  const realIndexRedirect = buildLegacyLayoutRedirectHtml('../index.html')
  mkdirSync(resolve(root, 'real'), { recursive: true })
  mkdirSync(resolve(root, 'dist', 'real'), { recursive: true })
  writeFileSync(resolve(root, 'real', 'index.html'), realIndexRedirect)
  writeFileSync(resolve(root, 'dist', 'real', 'index.html'), realIndexRedirect)

  let secretHtml = injectSecretPageMeta(baseHtml)
  secretHtml = adjustAppPageTitle(secretHtml, '???')
  if (!secretHtml.includes('name="robots"')) {
    secretHtml = secretHtml.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="robots" content="noindex, nofollow" />`,
    )
  }
  writeFileSync(resolve(root, 'secret.html'), secretHtml)
  writeFileSync(resolve(root, 'dist', 'secret.html'), secretHtml)

  let accountHtml = injectAccountPageMeta(baseHtml)
  accountHtml = adjustAppPageTitle(accountHtml, '个人中心')
  publishHtmlToLayoutDirs(accountHtml, 'account.html', root, resolve(root, 'dist'), { layouts: ['normal'] })
  writeRealRedirectToNormal('account.html', 'normal/account.html', root, resolve(root, 'dist'))
  writeLegacyRedirect('account.html', 'normal/account.html', root, resolve(root, 'dist'))

  let settingsHtml = injectSettingsPageMeta(baseHtml)
  settingsHtml = adjustAppPageTitle(settingsHtml, '设置')
  publishHtmlToLayoutDirs(settingsHtml, 'settings.html', root, resolve(root, 'dist'), { layouts: ['normal'] })
  writeRealRedirectToNormal('settings.html', 'normal/settings.html', root, resolve(root, 'dist'))
  writeLegacyRedirect('settings.html', 'normal/settings.html', root, resolve(root, 'dist'))

  let mapDrawHtml = injectMapDrawPageMeta(baseHtml)
  mapDrawHtml = adjustAppPageTitle(mapDrawHtml, '地图走线编辑')
  publishHtmlToLayoutDirs(mapDrawHtml, 'map-draw.html', root, resolve(root, 'dist'), { layouts: ['normal'] })
  writeRealRedirectToNormal('map-draw.html', 'normal/map-draw.html', root, resolve(root, 'dist'))
  writeLegacyRedirect('map-draw.html', 'normal/map-draw.html', root, resolve(root, 'dist'))

  let routeMapHtml = injectRouteMapPageMeta(baseHtml)
  routeMapHtml = adjustAppPageTitle(routeMapHtml, '线路走向图')
  publishHtmlToLayoutDirs(routeMapHtml, 'route-map.html', root, resolve(root, 'dist'), { layouts: ['normal'] })
  writeRealRedirectToNormal('route-map.html', 'normal/route-map.html', root, resolve(root, 'dist'))
  writeLegacyRedirect('route-map.html', 'normal/route-map.html', root, resolve(root, 'dist'))

  rmSync(resolve(root, 'tabs'), { recursive: true, force: true })
  rmSync(resolve(root, 'dist', 'tabs'), { recursive: true, force: true })

  generateRoutePages({
    targets: [resolve(root, 'routes'), resolve(root, 'dist', 'routes')],
  })

  const routeDetailStops = buildRouteDetailStops()
  console.log(
    `[route-detail-stops] ${routeDetailStops.stopCount} stops from ${routeDetailStops.routeCount} route sources`,
  )

  syncBrandAssets()
  syncCompanyLogos()
  syncWorldMapImages()
  buildWorldMapRoutesManifest()

  if (existsSync(distAudio)) {
    cpSync(distAudio, rootAudio, { recursive: true })
    console.log('[publish] 已复制音频到 audio/')
  } else if (existsSync(publicAudio)) {
    cpSync(publicAudio, rootAudio, { recursive: true })
    console.log('[publish] 已复制音频到 audio/')
  }

  const publicRouteMaps = resolve(root, 'public', 'route-maps')
  const distRouteMaps = resolve(root, 'dist', 'route-maps')
  const rootRouteMaps = resolve(root, 'route-maps')
  if (existsSync(distRouteMaps)) {
    cpSync(distRouteMaps, rootRouteMaps, { recursive: true })
    console.log('[publish] 已复制线路图到 route-maps/')
  } else if (existsSync(publicRouteMaps)) {
    cpSync(publicRouteMaps, rootRouteMaps, { recursive: true })
    console.log('[publish] 已复制线路图到 route-maps/')
  }

  const publicWorldMapRoutes = resolve(root, 'public', 'world-map-routes')
  const distWorldMapRoutes = resolve(root, 'dist', 'world-map-routes')
  const rootWorldMapRoutes = resolve(root, 'world-map-routes')
  if (existsSync(distWorldMapRoutes)) {
    cpSync(distWorldMapRoutes, rootWorldMapRoutes, { recursive: true })
    console.log('[publish] 已复制走线 JSON 到 world-map-routes/')
  } else if (existsSync(publicWorldMapRoutes)) {
    cpSync(publicWorldMapRoutes, rootWorldMapRoutes, { recursive: true })
    console.log('[publish] 已复制走线 JSON 到 world-map-routes/')
  }

  const publicWorldMaps = resolve(root, 'public', 'maps')
  const distWorldMaps = resolve(root, 'dist', 'maps')
  const rootWorldMaps = resolve(root, 'maps')
  if (existsSync(distWorldMaps)) {
    cpSync(distWorldMaps, rootWorldMaps, { recursive: true })
    console.log('[publish] 已复制群岛地图到 maps/')
  } else   if (existsSync(publicWorldMaps)) {
    cpSync(publicWorldMaps, rootWorldMaps, { recursive: true })
    console.log('[publish] 已复制群岛地图到 maps/')
  }

  const catalogSource = resolve(root, 'data', 'world-map-stops.json')
  if (existsSync(catalogSource)) {
    copyFileSync(catalogSource, resolve(root, 'world-map-stops.json'))
    copyFileSync(catalogSource, resolve(root, 'dist', 'world-map-stops.json'))
    copyFileSync(catalogSource, resolve(root, 'public', 'world-map-stops.json'))
    console.log('[publish] 已复制 world-map-stops.json')
  }

  const routeDetailStopsSource = resolve(root, 'data', 'route-detail-stops.json')
  if (existsSync(routeDetailStopsSource)) {
    copyFileSync(routeDetailStopsSource, resolve(root, 'route-detail-stops.json'))
    copyFileSync(routeDetailStopsSource, resolve(root, 'dist', 'route-detail-stops.json'))
    copyFileSync(routeDetailStopsSource, resolve(root, 'public', 'route-detail-stops.json'))
    console.log('[publish] 已复制 route-detail-stops.json')
  }

  const publicLogo = resolve(root, 'public', 'sibs-logo.png')
  if (existsSync(publicLogo)) {
    cpSync(publicLogo, resolve(root, 'sibs-logo.png'))
    cpSync(publicLogo, resolve(root, 'dist', 'sibs-logo.png'))
    cpSync(publicLogo, resolve(root, 'apple-touch-icon.png'))
    cpSync(publicLogo, resolve(root, 'dist', 'apple-touch-icon.png'))
  }

  const publicCompanyLogos = resolve(root, 'public', 'company-logos')
  if (existsSync(publicCompanyLogos)) {
    cpSync(publicCompanyLogos, resolve(root, 'company-logos'), { recursive: true })
    cpSync(publicCompanyLogos, resolve(root, 'dist', 'company-logos'), { recursive: true })
    console.log('[publish] 已复制运营商 Logo 到 company-logos/')
  }

  const distAssets = resolve(root, 'dist', 'assets')
  const rootAssets = resolve(root, 'assets')
  if (existsSync(distAssets)) {
    if (existsSync(rootAssets)) rmSync(rootAssets, { recursive: true, force: true })
    cpSync(distAssets, rootAssets, { recursive: true })
    console.log('[publish] 已复制构建资源到 assets/')
  }

  const noJekyllSource = resolve(root, 'public', '.nojekyll')
  if (existsSync(noJekyllSource)) {
    cpSync(noJekyllSource, resolve(root, '.nojekyll'))
    cpSync(noJekyllSource, resolve(root, 'dist', '.nojekyll'))
  }

  const serviceWorker = resolve(root, 'dist', 'sw.js')
  if (existsSync(serviceWorker)) {
    cpSync(serviceWorker, resolve(root, 'sw.js'))
  } else {
    const publicSw = resolve(root, 'public', 'sw.js')
    if (existsSync(publicSw)) cpSync(publicSw, resolve(root, 'sw.js'))
  }

  console.log(
    `[publish] 已更新 index.html、normal/* 与 real/*（${APP_PAGES.map((p) => p.publishFile).join('、')} 等；构建 ${buildTag}）`,
  )
  return { buildTag, built }
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  try {
    publishStandalone()
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
