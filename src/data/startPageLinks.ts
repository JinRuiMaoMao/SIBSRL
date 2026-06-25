import type { MessageKey } from '../i18n/messages'

export type StartPageExternalLinkId =
  | 'youtube'
  | 'discord'
  | 'roblox'
  | 'facebook'
  | 'website'
  | 'wiki'

export interface StartPageExternalLink {
  id: StartPageExternalLinkId
  url: string
  labelKey: MessageKey
}

/** Official community links (from sunshine-islands Google Site / Fandom wiki). */
export const START_PAGE_EXTERNAL_LINKS: StartPageExternalLink[] = [
  {
    id: 'youtube',
    url: 'https://www.youtube.com/channel/UCy4qUq7gFDdpBgR3399RR8g',
    labelKey: 'linkYouTube',
  },
  {
    id: 'discord',
    url: 'https://discord.gg/ypXG35w',
    labelKey: 'linkDiscord',
  },
  {
    id: 'roblox',
    url: 'https://www.roblox.com/games/1588965415',
    labelKey: 'linkRoblox',
  },
  {
    id: 'facebook',
    url: 'https://www.facebook.com/SunshineIslandsRblx',
    labelKey: 'linkFacebook',
  },
  {
    id: 'website',
    url: 'https://sites.google.com/view/sunshine-islands/home',
    labelKey: 'linkWebsite',
  },
  {
    id: 'wiki',
    url: 'https://sunshine-islands-roblox.fandom.com/wiki/Roblox_Sunshine_Islands',
    labelKey: 'linkWiki',
  },
]
