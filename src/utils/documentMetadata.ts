import { getSiteLogoUrl } from '../data/siteBrand'
import { getHtmlLang } from '../i18n/htmlLang'
import type { MessageKey } from '../i18n/messages'
import type { Locale } from '../i18n/types'
import type { AppTab } from '../types/appTab'
import { readPublishedBuild } from './buildLabel'

export const TAB_TITLE_KEYS: Record<AppTab, MessageKey> = {
  routes: 'tabRoutes',
  broadcast: 'tabBroadcast',
  music: 'tabMusic',
  complaints: 'tabComplaints',
  trivia: 'tabTrivia',
  updates: 'tabUpdates',
}

function resolveFaviconVersion(): string | null {
  return (
    readPublishedBuild() ??
    document.querySelector('meta[name="app-build"]')?.getAttribute('content')?.trim() ??
    null
  )
}

function withFaviconVersion(href: string): string {
  const version = resolveFaviconVersion()
  if (!version) return href
  const url = new URL(href, window.location.href)
  url.searchParams.set('v', version)
  return `${url.pathname}${url.search}`
}

function upsertHeadLink(rel: string, href: string, extra: Record<string, string> = {}): void {
  let link = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel]')).find(
    (node) => node.rel === rel,
  )
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  const resolved = new URL(href, window.location.href).href
  if (link.href !== resolved) {
    link.href = href
  }
  for (const [key, value] of Object.entries(extra)) {
    link.setAttribute(key, value)
  }
}

export function syncFavicon(href: string = getSiteLogoUrl()): void {
  const versioned = withFaviconVersion(href)
  upsertHeadLink('icon', versioned, { type: 'image/png', sizes: '53x53' })
  upsertHeadLink('apple-touch-icon', versioned, { sizes: '180x180' })
  upsertHeadLink('apple-touch-icon-precomposed', versioned)
}

export function syncHtmlLang(locale: Locale): void {
  document.documentElement.lang = getHtmlLang(locale)
}

export function formatDocumentTitle(pageLabel: string, suffix: string): string {
  return `${pageLabel} · ${suffix}`
}

const DEFAULT_SHARE_DESCRIPTION =
  '阳光群岛 Roblox 巴士模拟器 (SIBS) 线路查询：站序、车费、报站音频、群岛地图与每日挑战。Sunshine Islands Bus Simulator bus routes, fares, and stop audio.'

export type SocialShareMeta = {
  title: string
  description?: string
  url?: string
  imageUrl?: string
}

function upsertHeadMeta(
  selectorKey: 'name' | 'property',
  key: string,
  content: string,
  dataAttr?: string,
): void {
  const selector = `meta[${selectorKey}="${key}"]`
  let meta = document.head.querySelector<HTMLMetaElement>(selector)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(selectorKey, key)
    if (dataAttr) meta.setAttribute('data-site-social-meta', dataAttr)
    document.head.appendChild(meta)
  }
  if (meta.getAttribute('content') !== content) {
    meta.setAttribute('content', content)
  }
}

function upsertCanonicalLink(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  const resolved = new URL(href, window.location.href).href
  if (link.href !== resolved) {
    link.href = href
  }
}

function resolveDefaultShareImage(): string {
  const existing = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')
  const fromHead = existing?.getAttribute('content')?.trim()
  if (fromHead) return fromHead
  const versioned = withFaviconVersion(getSiteLogoUrl())
  return new URL(versioned, window.location.href).href
}

/** Keeps description / Open Graph / Twitter tags aligned when the SPA changes title. */
export function syncSocialShareMeta(meta: SocialShareMeta): void {
  const description = meta.description?.trim() || DEFAULT_SHARE_DESCRIPTION
  const pageUrl = meta.url?.trim() || window.location.href.split('#')[0]
  const imageUrl = meta.imageUrl?.trim() || resolveDefaultShareImage()

  upsertHeadMeta('name', 'description', description, '1')
  upsertCanonicalLink(pageUrl)
  upsertHeadMeta('property', 'og:title', meta.title)
  upsertHeadMeta('property', 'og:description', description)
  upsertHeadMeta('property', 'og:url', pageUrl)
  upsertHeadMeta('property', 'og:image', imageUrl)
  upsertHeadMeta('property', 'og:image:alt', meta.title)
  upsertHeadMeta('name', 'twitter:title', meta.title)
  upsertHeadMeta('name', 'twitter:description', description)
  upsertHeadMeta('name', 'twitter:image', imageUrl)
}
