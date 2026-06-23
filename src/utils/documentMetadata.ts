import { SITE_LOGO_URL } from '../data/siteBrand'
import { getHtmlLang } from '../i18n/htmlLang'
import type { MessageKey } from '../i18n/messages'
import type { Locale } from '../i18n/types'
import type { AppTab } from '../types/appTab'

export const TAB_TITLE_KEYS: Record<AppTab, MessageKey> = {
  routes: 'tabRoutes',
  broadcast: 'tabBroadcast',
  music: 'tabMusic',
  complaints: 'tabComplaints',
  updates: 'tabUpdates',
}

export function syncFavicon(href: string = SITE_LOGO_URL): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    document.head.appendChild(link)
  }
  const resolved = new URL(href, window.location.href).href
  if (link.href !== resolved) {
    link.href = href
    link.type = 'image/png'
  }
}

export function syncHtmlLang(locale: Locale): void {
  document.documentElement.lang = getHtmlLang(locale)
}

export function formatDocumentTitle(pageLabel: string, suffix: string): string {
  return `${pageLabel} · ${suffix}`
}
