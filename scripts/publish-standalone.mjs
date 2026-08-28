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
  injectSocialMeta,
  socialMetaForAppPage,
  buildCanonicalSiteUrl,
  buildOgImageUrl,
  readOgImageContentVersion,
  SITE_SOCIAL_DEFAULTS,
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
import { generateOgShareImage } from './generate-og-share.mjs'

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
    const layoutDir = resolve(siteRoot, dir)
    const distLayoutDir = resolve(distRoot, dir)
    mkdirSync(layoutDir, { recursive: true })
    mkdirSync(distLayoutDir, { recursive: true })
    writeFileSync(resolve(layoutDir, filename), scoped)
    writeFileSync(resolve(distLayoutDir, filename), scoped)
  }
}

/** @param {string} tab @param {string} filename @param {string} siteRoot @param {string} distRoot */
function writeRealTabHashRedirect(tab, filename, siteRoot, distRoot) {
  const target = `./index.html#${tab}`
  const redirectHtml = `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="UTF-8" />
  <script>location.replace('${target}'+location.search);</script>
  <meta http-equiv="refresh" content="0;url=${target}" />
  <title>Redirecting…</title>
</head>
<body><p><a href="${target}">Continue</a></p></body>
</html>`
  for (const dir of ['real']) {
    mkdirSync(resolve(siteRoot, dir), { recursive: true })
    mkdirSync(resolve(distRoot, dir), { recursive: true })
    writeFileSync(resolve(siteRoot, dir, filename), redirectHtml)
    writeFileSync(resolve(distRoot, dir, filename), redirectHtml)
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
export async function publishStandalone(options = {}) {
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

  syncBrandAssets()

  const ogSharePublic = resolve(root, 'public', 'og-share.png')
  const ogShareV2Public = resolve(root, 'public', 'og-share-v2.png')
  const shouldRegenerateOgShare =
    process.env.REGENERATE_OG_SHARE === '1' ||
    (process.env.CI !== 'true' && !existsSync(ogShareV2Public))

  if (shouldRegenerateOgShare) {
    try {
      await generateOgShareImage()
    } catch (err) {
      console.warn('[publish] og-share.png 生成失败，将回退默认分享图:', err?.message ?? err)
    }
  } else if (process.env.CI === 'true') {
    console.log('[publish] CI：使用仓库内已提交的 og-share 图，跳过 Playwright 重新生成')
  }

  if (existsSync(ogSharePublic)) {
    cpSync(ogSharePublic, ogShareV2Public)
    cpSync(ogSharePublic, resolve(root, 'og-share-v2.png'))
    cpSync(ogSharePublic, resolve(root, 'dist', 'og-share-v2.png'))
  }

  process.env.OG_IMAGE_CONTENT_VERSION = readOgImageContentVersion({ root })

  for (const page of APP_PAGES) {
    let html = injectAppTabMeta(baseHtml, page.tab)
    const seoTitle = page.seoTitleZh
    html = adjustAppPageTitle(html, seoTitle ?? page.titleZh, { standalone: Boolean(seoTitle) })
    html = injectSocialMeta(
      html,
      socialMetaForAppPage({
        tab: page.tab,
        titleZh: page.titleZh,
        seoTitleZh: page.seoTitleZh,
        buildTag,
      }),
    )
    publishHtmlToLayoutDirs(html, page.publishFile, root, resolve(root, 'dist'), { layouts: ['normal'] })
    writeRealTabHashRedirect(page.tab, page.publishFile, root, resolve(root, 'dist'))
    writeLegacyRedirect(page.publishFile, `normal/${page.publishFile}`, root, resolve(root, 'dist'))
  }

  let startHtml = injectStartBootSplash(injectStartPageMeta(baseHtml))
  startHtml = adjustAppPageTitle(startHtml, '阳光群岛巴士线路查询', { standalone: true })
  startHtml = injectSocialMeta(startHtml, {
    title:
      '阳光群岛 Roblox 巴士模拟器线路查询入口 | SIBS 站序、车费、群岛地图与每日挑战工具',
    description:
      '阳光群岛 Roblox 巴士模拟器 (SIBS) 官方向线路查询入口：站序、车费、群岛地图、每日挑战与工具下载。Sunshine Islands Bus Simulator (SIBS) route lookup hub.',
    url: buildCanonicalSiteUrl('index.html'),
    imageUrl: buildOgImageUrl(buildTag),
    keywords: SITE_SOCIAL_DEFAULTS.keywords,
    siteName: SITE_SOCIAL_DEFAULTS.siteName,
  })
  writeFileSync(resolve(root, 'index.html'), startHtml)
  writeFileSync(resolve(root, 'dist', 'index.html'), startHtml)

  let realStartHtml = injectStartBootSplash(injectStartPageMeta(baseHtml))
  realStartHtml = prepareLayoutScopedHtml(realStartHtml, 'real', true)
  realStartHtml = injectRealLayoutMusicEarlyBootstrap(realStartHtml)
  realStartHtml = adjustAppPageTitle(realStartHtml, '阳光群岛巴士模拟器', { standalone: true })
  realStartHtml = injectSocialMeta(realStartHtml, {
    title:
      '阳光群岛 Roblox 巴士模拟器分屏线路查询 | SIBS 左侧线路右侧全屏群岛地图',
    description:
      '阳光群岛 (SIBS) Roblox 巴士模拟器分屏线路查询：左侧线路、右侧群岛全屏地图。Sunshine Islands split layout route lookup with full-height map.',
    url: buildCanonicalSiteUrl('real/index.html'),
    imageUrl: buildOgImageUrl(buildTag),
    keywords: SITE_SOCIAL_DEFAULTS.keywords,
    siteName: SITE_SOCIAL_DEFAULTS.siteName,
  })
  mkdirSync(resolve(root, 'real'), { recursive: true })
  mkdirSync(resolve(root, 'dist', 'real'), { recursive: true })
  writeFileSync(resolve(root, 'real', 'index.html'), realStartHtml)
  writeFileSync(resolve(root, 'dist', 'real', 'index.html'), realStartHtml)
  writeRealTabHashRedirect('language', 'language.html', root, resolve(root, 'dist'))

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
  accountHtml = injectSocialMeta(accountHtml, {
    title: '个人中心 · 阳光群岛线路查询',
    description: 'SIBS 线路查询账号：收藏线路、同步设置与资料反馈。SIBS Route Lookup account and profile.',
    url: buildCanonicalSiteUrl('normal/account.html'),
    imageUrl: buildOgImageUrl(buildTag),
    keywords: SITE_SOCIAL_DEFAULTS.keywords,
    siteName: SITE_SOCIAL_DEFAULTS.siteName,
  })
  publishHtmlToLayoutDirs(accountHtml, 'account.html', root, resolve(root, 'dist'), { layouts: ['normal'] })
  writeRealRedirectToNormal('account.html', 'normal/account.html', root, resolve(root, 'dist'))
  writeLegacyRedirect('account.html', 'normal/account.html', root, resolve(root, 'dist'))

  let settingsHtml = injectSettingsPageMeta(baseHtml)
  settingsHtml = adjustAppPageTitle(settingsHtml, '设置')
  settingsHtml = injectSocialMeta(settingsHtml, {
    title: '设置 · 阳光群岛线路查询',
    description: '主题、语言、线路列表与资料反馈等站点设置。Site preferences and route data feedback.',
    url: buildCanonicalSiteUrl('normal/settings.html'),
    imageUrl: buildOgImageUrl(buildTag),
    keywords: SITE_SOCIAL_DEFAULTS.keywords,
    siteName: SITE_SOCIAL_DEFAULTS.siteName,
  })
  publishHtmlToLayoutDirs(settingsHtml, 'settings.html', root, resolve(root, 'dist'), { layouts: ['normal'] })
  writeRealRedirectToNormal('settings.html', 'normal/settings.html', root, resolve(root, 'dist'))
  writeLegacyRedirect('settings.html', 'normal/settings.html', root, resolve(root, 'dist'))

  let mapDrawHtml = injectMapDrawPageMeta(baseHtml)
  mapDrawHtml = adjustAppPageTitle(mapDrawHtml, '地图走线编辑')
  mapDrawHtml = injectSocialMeta(mapDrawHtml, {
    title: '地图走线编辑 · 阳光群岛线路查询',
    description: '阳光群岛地图走线绘制与编辑工具 (Beta)。Sunshine Islands island map route draw editor.',
    url: buildCanonicalSiteUrl('normal/map-draw.html'),
    imageUrl: buildOgImageUrl(buildTag),
    keywords: SITE_SOCIAL_DEFAULTS.keywords,
    siteName: SITE_SOCIAL_DEFAULTS.siteName,
  })
  publishHtmlToLayoutDirs(mapDrawHtml, 'map-draw.html', root, resolve(root, 'dist'), { layouts: ['normal'] })
  writeRealRedirectToNormal('map-draw.html', 'normal/map-draw.html', root, resolve(root, 'dist'))
  writeLegacyRedirect('map-draw.html', 'normal/map-draw.html', root, resolve(root, 'dist'))

  let routeMapHtml = injectRouteMapPageMeta(baseHtml)
  routeMapHtml = adjustAppPageTitle(routeMapHtml, '线路走向图')
  routeMapHtml = injectSocialMeta(routeMapHtml, {
    title: '线路走向图 · 阳光群岛线路查询',
    description: '查看阳光群岛巴士线路走向图与导入走线。Sunshine Islands bus route path maps.',
    url: buildCanonicalSiteUrl('normal/route-map.html'),
    imageUrl: buildOgImageUrl(buildTag),
    keywords: SITE_SOCIAL_DEFAULTS.keywords,
    siteName: SITE_SOCIAL_DEFAULTS.siteName,
  })
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

  const publicOgShare = resolve(root, 'public', 'og-share.png')
  if (existsSync(publicOgShare)) {
    cpSync(publicOgShare, resolve(root, 'og-share.png'))
    cpSync(publicOgShare, resolve(root, 'dist', 'og-share.png'))
    console.log('[publish] 已复制 og-share.png（社交分享缩略图）')
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
  publishStandalone()
    .then(() => {})
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    })
}
