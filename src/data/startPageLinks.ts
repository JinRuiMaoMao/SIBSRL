import type { MessageKey } from '../i18n/messages'
import type { Locale } from '../i18n/types'

export type StartPageExternalLinkId =
  | 'youtube'
  | 'discord'
  | 'roblox'
  | 'facebook'
  | 'website'
  | 'wiki'

export interface StartPageExternalLink {
  id: StartPageExternalLinkId
  labelKey: MessageKey
}

const START_PAGE_WIKI_URL_ZH_HANT =
  'https://roblox.fandom.com/zh/wiki/%E9%99%BD%E5%85%89%E7%BE%A4%E5%B3%B6%E5%B7%B4%E5%A3%AB?variant=zh-hk'

const START_PAGE_WIKI_URL_DEFAULT =
  'https://sunshine-islands-roblox.fandom.com/wiki/Sunshine_Islands_Bus_Simulator_Wiki'

const START_PAGE_LINK_URLS: Record<Exclude<StartPageExternalLinkId, 'wiki'>, string> = {
  youtube: 'https://www.youtube.com/channel/UCy4qUq7gFDdpBgR3399RR8g',
  discord: 'https://discord.gg/ypXG35w',
  roblox: 'https://www.roblox.com/games/1588965415',
  facebook: 'https://www.facebook.com/SunshineIslandsRblx',
  website: 'https://sites.google.com/view/sunshine-islands',
}

/** Official community links (from sunshine-islands Google Site / Fandom wiki). */
export const START_PAGE_EXTERNAL_LINKS: StartPageExternalLink[] = [
  { id: 'youtube', labelKey: 'linkYouTube' },
  { id: 'discord', labelKey: 'linkDiscord' },
  { id: 'roblox', labelKey: 'linkRoblox' },
  { id: 'facebook', labelKey: 'linkFacebook' },
  { id: 'website', labelKey: 'linkWebsite' },
  { id: 'wiki', labelKey: 'linkWiki' },
]

export function getStartPageWikiUrl(locale: Locale): string {
  return locale === 'zh-Hant' ? START_PAGE_WIKI_URL_ZH_HANT : START_PAGE_WIKI_URL_DEFAULT
}

export function getStartPageExternalLinkUrl(id: StartPageExternalLinkId, locale: Locale): string {
  if (id === 'wiki') return getStartPageWikiUrl(locale)
  return START_PAGE_LINK_URLS[id]
}
