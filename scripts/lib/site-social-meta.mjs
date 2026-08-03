import { buildRoutePagePath } from './route-page-filename.mjs'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)), '..')

const DEFAULT_SITE_PUBLIC_URL = 'https://jinruimaomao.github.io/SIBSRL'

const DEFAULT_KEYWORDS =
  'Roblox, 阳光群岛, Sunshine Islands, SIBS, 巴士线路, 公交车, Bus Simulator, 线路查询, Roblox 巴士'

const DEFAULT_DESCRIPTION =
  '阳光群岛 Roblox 巴士模拟器 (SIBS) 线路查询：站序、车费、报站音频、群岛地图与每日挑战。Sunshine Islands Bus Simulator bus routes, fares, and stop audio.'

const DEFAULT_SITE_NAME = '阳光群岛线路查询 · SIBS Route Lookup'

const DEFAULT_OG_IMAGE_PATH = 'og-share-v2.png'
const DEFAULT_OG_IMAGE_WIDTH = 1200
const DEFAULT_OG_IMAGE_HEIGHT = 630

/** @param {string} value */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function resolveSitePublicOrigin() {
  const raw =
    process.env.SITE_PUBLIC_URL?.trim() ||
    process.env.VITE_SITE_PUBLIC_URL?.trim() ||
    DEFAULT_SITE_PUBLIC_URL
  return raw.replace(/\/$/, '')
}

/** @param {{ root?: string }} [options] */
export function readOgImageContentVersion(options = {}) {
  const root = options.root ?? packageRoot
  const imagePath =
    process.env.SITE_OG_IMAGE_PATH?.trim().replace(/^\//, '') || DEFAULT_OG_IMAGE_PATH
  const candidates = [
    resolve(root, 'public', imagePath),
    resolve(root, imagePath),
    resolve(root, 'public', 'og-share.png'),
  ]
  for (const file of candidates) {
    if (!existsSync(file)) continue
    return createHash('md5').update(readFileSync(file)).digest('hex').slice(0, 12)
  }
  return ''
}

/** @param {string} [buildTag] @param {string} [contentVersion] */
export function buildOgImageUrl(buildTag = '', contentVersion = '') {
  const imagePath =
    process.env.SITE_OG_IMAGE_PATH?.trim().replace(/^\//, '') || DEFAULT_OG_IMAGE_PATH
  const origin = resolveSitePublicOrigin()
  const content =
    contentVersion?.trim() ||
    process.env.OG_IMAGE_CONTENT_VERSION?.trim() ||
    readOgImageContentVersion()
  const versionKey = [content, buildTag].filter(Boolean).join('.')
  const version = versionKey ? `?v=${encodeURIComponent(versionKey)}` : ''
  return `${origin}/${imagePath}${version}`
}

export function resolveOgImageDimensions(imagePath = DEFAULT_OG_IMAGE_PATH) {
  const normalized = imagePath.replace(/^\//, '')
  if (normalized === DEFAULT_OG_IMAGE_PATH || normalized === 'og-share.png' || normalized === 'og-share-v2.png') {
    return { width: DEFAULT_OG_IMAGE_WIDTH, height: DEFAULT_OG_IMAGE_HEIGHT }
  }
  return null
}

/** @param {string} path e.g. normal/routes.html */
export function buildCanonicalSiteUrl(path) {
  const origin = resolveSitePublicOrigin()
  const clean = path.replace(/^\//, '')
  return `${origin}/${clean}`
}

/**
 * @param {{
 *   title: string
 *   description?: string
 *   url: string
 *   imageUrl?: string
 *   type?: string
 *   keywords?: string
 *   locale?: string
 *   siteName?: string
 *   twitterCard?: string
 *   imageWidth?: number
 *   imageHeight?: number
 * }} options
 */
export function buildSocialMetaBlock(options) {
  const title = escapeHtml(options.title)
  const description = escapeHtml(options.description ?? DEFAULT_DESCRIPTION)
  const url = escapeHtml(options.url)
  const rawImagePath =
    process.env.SITE_OG_IMAGE_PATH?.trim().replace(/^\//, '') || DEFAULT_OG_IMAGE_PATH
  const imageUrl = escapeHtml(options.imageUrl ?? buildOgImageUrl())
  const dims = resolveOgImageDimensions(rawImagePath)
  const imageWidth = options.imageWidth ?? dims?.width
  const imageHeight = options.imageHeight ?? dims?.height
  const type = escapeHtml(options.type ?? 'website')
  const keywords = escapeHtml(options.keywords ?? DEFAULT_KEYWORDS)
  const locale = escapeHtml(options.locale ?? 'zh_CN')
  const siteName = escapeHtml(options.siteName ?? DEFAULT_SITE_NAME)
  const twitterCard = escapeHtml(options.twitterCard ?? 'summary_large_image')

  return [
    '<!-- site-social-meta -->',
    `<meta data-site-social-meta="1" name="keywords" content="${keywords}" />`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    imageWidth ? `<meta property="og:image:width" content="${imageWidth}" />` : '',
    imageHeight ? `<meta property="og:image:height" content="${imageHeight}" />` : '',
    `<meta property="og:image:alt" content="${title}" />`,
    `<meta property="og:locale" content="${locale}" />`,
    `<meta name="twitter:card" content="${twitterCard}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
    '<!-- /site-social-meta -->',
  ]
    .filter(Boolean)
    .join('\n    ')
}

const SOCIAL_META_BLOCK_RE = /<!-- site-social-meta -->[\s\S]*?<!-- \/site-social-meta -->/

/**
 * @param {string} html
 * @param {Parameters<typeof buildSocialMetaBlock>[0]} options
 */
export function injectSocialMeta(html, options) {
  const block = buildSocialMetaBlock(options)
  if (SOCIAL_META_BLOCK_RE.test(html)) {
    return html.replace(SOCIAL_META_BLOCK_RE, block)
  }

  let out = html.replace(/<meta\s+name="description"[^>]*\/?>\s*/gi, '')

  if (/<meta\s+name="viewport"/i.test(out)) {
    return out.replace(/(<meta\s+name="viewport"[^>]*\/?>)/i, `$1\n    ${block}`)
  }

  return out.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${block}`)
}

export const SITE_SOCIAL_DEFAULTS = {
  keywords: DEFAULT_KEYWORDS,
  description: DEFAULT_DESCRIPTION,
  siteName: DEFAULT_SITE_NAME,
}

/** @param {{ tab: string, titleZh: string, seoTitleZh?: string, buildTag?: string, standalone?: boolean }} page */
export function socialMetaForAppPage(page, buildTag = '') {
  const versionTag = page.buildTag ?? buildTag
  const suffix = '阳光群岛线路查询'
  const title = page.seoTitleZh
    ? page.seoTitleZh
    : page.standalone
      ? page.titleZh
      : `${page.titleZh} · ${suffix}`
  const pathByTab = {
    routes: 'normal/routes.html',
    broadcast: 'normal/ann.html',
    music: 'normal/music.html',
    complaints: 'normal/complaints.html',
    trivia: 'normal/trivia.html',
    updates: 'normal/updates.html',
  }
  const path = pathByTab[page.tab] ?? 'normal/routes.html'
  const tabDescriptions = {
    routes:
      '查询阳光群岛 (SIBS) Roblox 巴士线路站序、车费、换乘与群岛地图。Look up Sunshine Islands bus routes, stops, and fares.',
    broadcast: '阳光群岛广播与报站相关资源。SIBS broadcast and route announcement references.',
    music: '阳光群岛线路音乐与车厂音乐试听。Sunshine Islands route and depot music.',
    complaints: '阳光群岛 NPC 乘客语音试听。Sunshine Islands NPC passenger voice clips.',
    trivia: '阳光群岛巴士冷知识与你知道吗。Sunshine Islands bus trivia.',
    updates: '阳光群岛线路查询工具版本更新日志。SIBS Route Lookup changelog.',
  }
  return {
    title,
    description: tabDescriptions[page.tab] ?? SITE_SOCIAL_DEFAULTS.description,
    url: buildCanonicalSiteUrl(path),
    imageUrl: buildOgImageUrl(versionTag),
    keywords: SITE_SOCIAL_DEFAULTS.keywords,
    siteName: SITE_SOCIAL_DEFAULTS.siteName,
  }
}

/** @param {string} routeId @param {Record<string, unknown>} [routeData] @param {string} [buildTag] */
export function socialMetaForRoutePage(routeId, routeData = {}, buildTag = '') {
  const safeId = String(routeId)
  const name = routeData.name
  let routeLabel = ''
  if (name && typeof name === 'object') {
    const zh = /** @type {{ zh?: string }} */ (name).zh
    const en = /** @type {{ en?: string }} */ (name).en
    routeLabel = (zh || en || '').trim()
  }
  const title = routeLabel
    ? `${safeId} 路 ${routeLabel} | 阳光群岛 SIBS Roblox 巴士站序车费与报站查询`
    : `${safeId} 路巴士线路 | 阳光群岛 SIBS Roblox 站序、车费与报站音频查询`
  const description = routeLabel
    ? `阳光群岛 Roblox 巴士 ${safeId} 路：${routeLabel}。站序、车费与报站音频 — SIBS 线路查询。Sunshine Islands (SIBS) bus route ${safeId}: ${routeLabel}. Stops, fare, and audio.`
    : `阳光群岛 Roblox 巴士 ${safeId} 路线路查询：站序、车费与报站音频。Sunshine Islands (SIBS) bus route ${safeId} stops, fare, and announcement audio.`
  const path = buildRoutePagePath(safeId)
  return {
    title,
    description,
    url: buildCanonicalSiteUrl(path),
    imageUrl: buildOgImageUrl(buildTag),
    keywords: `${SITE_SOCIAL_DEFAULTS.keywords}, ${safeId}, 线路 ${safeId}`,
    siteName: SITE_SOCIAL_DEFAULTS.siteName,
  }
}
