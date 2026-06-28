import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  APP_PAGES,
  adjustAppPageTitle,
  injectAppTabMeta,
  injectDevToolsBlock,
  injectLocaleBootstrap,
  injectAccountPageMeta,
  injectSettingsPageMeta,
  injectNoScriptGuard,
  injectSecretPageMeta,
  injectServiceWorkerBootstrap,
  injectStartPageMeta,
  injectThemeBootstrap,
  injectAppSurfaceBootstrap,
  injectUserApiMeta,
  syncFaviconLink,
} from './lib/app-page-html.mjs'
import { injectStartBootSplash } from './lib/start-boot-splash.mjs'
import { generateRoutePages } from './generate-route-pages.mjs'
import { syncBrandAssets } from './sync-brand-assets.mjs'
import { syncWorldMapImages } from './sync-world-map-images.mjs'
import { buildWorldMapRoutesManifest } from './build-world-map-routes-manifest.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const built = resolve(root, 'dist', 'dev.html')
const publicAudio = resolve(root, 'public', 'audio')
const distAudio = resolve(root, 'dist', 'audio')
const rootAudio = resolve(root, 'audio')

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
      '<div id="root"><p class="boot-hint">加载中…</p></div>',
    )
  }
  return out
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

  const baseHtml = injectServiceWorkerBootstrap(
    injectAppSurfaceBootstrap(
      syncFaviconLink(
        injectUserApiMeta(
          injectLocaleBootstrap(
            injectThemeBootstrap(
              injectDevToolsBlock(
                injectNoScriptGuard(prepareStandaloneHtml(readFileSync(built, 'utf8'), buildTag)),
              ),
            ),
          ),
        ),
        buildTag,
      ),
    ),
  )

  for (const page of APP_PAGES) {
    let html = injectAppTabMeta(baseHtml, page.tab)
    html = adjustAppPageTitle(html, page.titleZh)
    writeFileSync(resolve(root, page.publishFile), html)
    writeFileSync(resolve(root, 'dist', page.publishFile), html)
  }

  let startHtml = injectStartBootSplash(injectStartPageMeta(baseHtml))
  startHtml = adjustAppPageTitle(startHtml, '阳光群岛巴士线路查询', { standalone: true })
  writeFileSync(resolve(root, 'index.html'), startHtml)
  writeFileSync(resolve(root, 'dist', 'index.html'), startHtml)

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
  writeFileSync(resolve(root, 'account.html'), accountHtml)
  writeFileSync(resolve(root, 'dist', 'account.html'), accountHtml)

  let settingsHtml = injectSettingsPageMeta(baseHtml)
  settingsHtml = adjustAppPageTitle(settingsHtml, '设置')
  writeFileSync(resolve(root, 'settings.html'), settingsHtml)
  writeFileSync(resolve(root, 'dist', 'settings.html'), settingsHtml)

  rmSync(resolve(root, 'tabs'), { recursive: true, force: true })
  rmSync(resolve(root, 'dist', 'tabs'), { recursive: true, force: true })

  generateRoutePages({
    targets: [resolve(root, 'routes'), resolve(root, 'dist', 'routes')],
  })

  syncBrandAssets()
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

  const publicWorldMaps = resolve(root, 'public', 'maps')
  const distWorldMaps = resolve(root, 'dist', 'maps')
  const rootWorldMaps = resolve(root, 'maps')
  if (existsSync(distWorldMaps)) {
    cpSync(distWorldMaps, rootWorldMaps, { recursive: true })
    console.log('[publish] 已复制群岛地图到 maps/')
  } else if (existsSync(publicWorldMaps)) {
    cpSync(publicWorldMaps, rootWorldMaps, { recursive: true })
    console.log('[publish] 已复制群岛地图到 maps/')
  }

  const routeMapPage = resolve(root, 'pages', 'route-map.html')
  if (existsSync(routeMapPage)) {
    cpSync(routeMapPage, resolve(root, 'route-map.html'))
    cpSync(routeMapPage, resolve(root, 'dist', 'route-map.html'))
  }

  const publicLogo = resolve(root, 'public', 'sibs-logo.png')
  if (existsSync(publicLogo)) {
    cpSync(publicLogo, resolve(root, 'sibs-logo.png'))
    cpSync(publicLogo, resolve(root, 'dist', 'sibs-logo.png'))
    cpSync(publicLogo, resolve(root, 'apple-touch-icon.png'))
    cpSync(publicLogo, resolve(root, 'dist', 'apple-touch-icon.png'))
  }

  const serviceWorker = resolve(root, 'dist', 'sw.js')
  if (existsSync(serviceWorker)) {
    cpSync(serviceWorker, resolve(root, 'sw.js'))
  } else {
    const publicSw = resolve(root, 'public', 'sw.js')
    if (existsSync(publicSw)) cpSync(publicSw, resolve(root, 'sw.js'))
  }

  console.log(
    `[publish] 已更新 index.html、${APP_PAGES.map((p) => p.publishFile).join('、')}（构建 ${buildTag}）`,
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
