import { SITE_LOGO_URL } from '../data/siteBrand'
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

export function syncFavicon(href: string = SITE_LOGO_URL): void {
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
