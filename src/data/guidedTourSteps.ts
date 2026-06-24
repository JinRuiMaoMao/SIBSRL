import type { MessageKey } from '../i18n/messages'
import { readTabFromLocation } from '../utils/appTabNavigation'
import { readRouteQueryFromLocation } from '../utils/routeNavigation'

export type GuidedTourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export type GuidedTourContext =
  | 'routes-list'
  | 'route-detail'
  | 'music'
  | 'broadcast'
  | 'complaints'
  | 'updates'

/** @deprecated alias — tour mode equals page context */
export type GuidedTourMode = GuidedTourContext

export const GUIDED_TOUR_CONTEXTS: GuidedTourContext[] = [
  'routes-list',
  'route-detail',
  'music',
  'broadcast',
  'complaints',
  'updates',
]

export interface GuidedTourStep {
  id: string
  target?: string
  titleKey: MessageKey
  bodyKey: MessageKey
  placement?: GuidedTourPlacement
  optional?: boolean
  beforeShow?: () => void
}

function expandRouteGroup(selector: string): void {
  const section = document.querySelector(selector)
  if (!section || section.classList.contains('is-open')) return
  const trigger = section.querySelector('.route-group-collapse-trigger')
  if (trigger instanceof HTMLButtonElement) trigger.click()
}

function expandHeaderIfCollapsed(): void {
  const shell = document.querySelector('.site-header-shell.is-collapsed')
  if (!shell) return
  const toggle = document.querySelector('.header-collapse-toggle')
  if (toggle instanceof HTMLButtonElement) toggle.click()
}

function revealBottomTabBarForTour(): void {
  document.querySelector('.app-tab-bar-shell--desktop')?.classList.add('is-tour-visible')
  window.dispatchEvent(new CustomEvent('sibs-reveal-tab-bar'))
}

const TABS_STEP: GuidedTourStep = {
  id: 'tabs',
  target: '[data-tour="app-tab-bar"]',
  titleKey: 'guidedTourTabsTitle',
  bodyKey: 'guidedTourTabsBody',
  placement: 'top',
  beforeShow: () => {
    expandHeaderIfCollapsed()
    revealBottomTabBarForTour()
  },
}

const SETTINGS_STEP: GuidedTourStep = {
  id: 'settings',
  target: '[data-tour="settings"]',
  titleKey: 'guidedTourSettingsTitle',
  bodyKey: 'guidedTourSettingsBody',
  placement: 'left',
}

const ACCOUNT_STEP: GuidedTourStep = {
  id: 'account',
  target: '[data-tour="account"]',
  titleKey: 'guidedTourAccountTitle',
  bodyKey: 'guidedTourAccountBody',
  placement: 'left',
  optional: true,
}

function finishStep(titleKey: MessageKey, bodyKey: MessageKey): GuidedTourStep {
  return { id: 'finish', titleKey, bodyKey, placement: 'center' }
}

export const ROUTES_LIST_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome',
    titleKey: 'guidedTourWelcomeTitle',
    bodyKey: 'guidedTourWelcomeBody',
    placement: 'center',
  },
  TABS_STEP,
  {
    id: 'search',
    target: '[data-tour="route-search"]',
    titleKey: 'guidedTourSearchTitle',
    bodyKey: 'guidedTourSearchBody',
    placement: 'bottom',
  },
  {
    id: 'filters',
    target: '[data-tour="filters"]',
    titleKey: 'guidedTourFiltersTitle',
    bodyKey: 'guidedTourFiltersBody',
    placement: 'bottom',
  },
  {
    id: 'random',
    target: '[data-tour="random-route"]',
    titleKey: 'guidedTourRandomTitle',
    bodyKey: 'guidedTourRandomBody',
    placement: 'bottom',
  },
  {
    id: 'daily-challenge',
    target: '[data-tour="daily-challenge"]',
    titleKey: 'guidedTourDailyTitle',
    bodyKey: 'guidedTourDailyBody',
    placement: 'bottom',
    optional: true,
  },
  {
    id: 'favorites',
    target: '[data-tour="favorites"]',
    titleKey: 'guidedTourFavoritesTitle',
    bodyKey: 'guidedTourFavoritesBody',
    placement: 'bottom',
    optional: true,
    beforeShow: () => expandRouteGroup('[data-tour="favorites"]'),
  },
  {
    id: 'route-card',
    target: '[data-tour="route-card"]',
    titleKey: 'guidedTourRouteCardTitle',
    bodyKey: 'guidedTourRouteCardBody',
    placement: 'top',
    optional: true,
    beforeShow: () => expandRouteGroup('[data-tour="route-group-normal"]'),
  },
  SETTINGS_STEP,
  ACCOUNT_STEP,
  finishStep('guidedTourFinishTitle', 'guidedTourFinishBody'),
]

export const ROUTE_DETAIL_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome',
    titleKey: 'guidedTourRouteDetailWelcomeTitle',
    bodyKey: 'guidedTourRouteDetailWelcomeBody',
    placement: 'center',
  },
  {
    id: 'direction',
    target: '[data-tour="route-detail-direction"]',
    titleKey: 'guidedTourRouteDetailDirectionTitle',
    bodyKey: 'guidedTourRouteDetailDirectionBody',
    placement: 'bottom',
    optional: true,
  },
  {
    id: 'endpoints',
    target: '[data-tour="route-detail-endpoints"]',
    titleKey: 'guidedTourRouteDetailEndpointsTitle',
    bodyKey: 'guidedTourRouteDetailEndpointsBody',
    placement: 'bottom',
  },
  {
    id: 'info',
    target: '[data-tour="route-detail-info"]',
    titleKey: 'guidedTourRouteDetailInfoTitle',
    bodyKey: 'guidedTourRouteDetailInfoBody',
    placement: 'top',
    optional: true,
  },
  {
    id: 'stops',
    target: '[data-tour="route-detail-stops"]',
    titleKey: 'guidedTourRouteDetailStopsTitle',
    bodyKey: 'guidedTourRouteDetailStopsBody',
    placement: 'top',
    optional: true,
  },
  {
    id: 'actions',
    target: '[data-tour="route-detail-actions"]',
    titleKey: 'guidedTourRouteDetailActionsTitle',
    bodyKey: 'guidedTourRouteDetailActionsBody',
    placement: 'left',
  },
  {
    id: 'close',
    target: '[data-tour="route-detail-close"]',
    titleKey: 'guidedTourRouteDetailCloseTitle',
    bodyKey: 'guidedTourRouteDetailCloseBody',
    placement: 'left',
  },
  finishStep('guidedTourRouteDetailFinishTitle', 'guidedTourRouteDetailFinishBody'),
]

export const MUSIC_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome',
    titleKey: 'guidedTourMusicWelcomeTitle',
    bodyKey: 'guidedTourMusicWelcomeBody',
    placement: 'center',
  },
  {
    id: 'list',
    target: '[data-tour="music-list"]',
    titleKey: 'guidedTourMusicListTitle',
    bodyKey: 'guidedTourMusicListBody',
    placement: 'top',
  },
  {
    id: 'play',
    target: '[data-tour="music-play"]',
    titleKey: 'guidedTourMusicPlayTitle',
    bodyKey: 'guidedTourMusicPlayBody',
    placement: 'left',
    optional: true,
  },
  finishStep('guidedTourMusicFinishTitle', 'guidedTourMusicFinishBody'),
]

export const BROADCAST_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome',
    titleKey: 'guidedTourBroadcastWelcomeTitle',
    bodyKey: 'guidedTourBroadcastWelcomeBody',
    placement: 'center',
  },
  {
    id: 'filters',
    target: '[data-tour="broadcast-filters"]',
    titleKey: 'guidedTourBroadcastFiltersTitle',
    bodyKey: 'guidedTourBroadcastFiltersBody',
    placement: 'bottom',
  },
  {
    id: 'search',
    target: '[data-tour="broadcast-search"]',
    titleKey: 'guidedTourBroadcastSearchTitle',
    bodyKey: 'guidedTourBroadcastSearchBody',
    placement: 'bottom',
  },
  {
    id: 'card',
    target: '[data-tour="broadcast-card"]',
    titleKey: 'guidedTourBroadcastCardTitle',
    bodyKey: 'guidedTourBroadcastCardBody',
    placement: 'top',
    optional: true,
  },
  {
    id: 'play',
    target: '[data-tour="broadcast-play"]',
    titleKey: 'guidedTourBroadcastPlayTitle',
    bodyKey: 'guidedTourBroadcastPlayBody',
    placement: 'left',
    optional: true,
  },
  finishStep('guidedTourBroadcastFinishTitle', 'guidedTourBroadcastFinishBody'),
]

export const COMPLAINTS_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome',
    titleKey: 'guidedTourComplaintsWelcomeTitle',
    bodyKey: 'guidedTourComplaintsWelcomeBody',
    placement: 'center',
  },
  {
    id: 'filters',
    target: '[data-tour="complaints-filters"]',
    titleKey: 'guidedTourComplaintsFiltersTitle',
    bodyKey: 'guidedTourComplaintsFiltersBody',
    placement: 'bottom',
  },
  {
    id: 'card',
    target: '[data-tour="complaints-card"]',
    titleKey: 'guidedTourComplaintsCardTitle',
    bodyKey: 'guidedTourComplaintsCardBody',
    placement: 'top',
    optional: true,
  },
  {
    id: 'play',
    target: '[data-tour="complaints-play"]',
    titleKey: 'guidedTourComplaintsPlayTitle',
    bodyKey: 'guidedTourComplaintsPlayBody',
    placement: 'left',
    optional: true,
  },
  finishStep('guidedTourComplaintsFinishTitle', 'guidedTourComplaintsFinishBody'),
]

export const UPDATES_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome',
    titleKey: 'guidedTourUpdatesWelcomeTitle',
    bodyKey: 'guidedTourUpdatesWelcomeBody',
    placement: 'center',
  },
  {
    id: 'head',
    target: '[data-tour="updates-head"]',
    titleKey: 'guidedTourUpdatesHeadTitle',
    bodyKey: 'guidedTourUpdatesHeadBody',
    placement: 'bottom',
  },
  {
    id: 'entry',
    target: '[data-tour="updates-entry"]',
    titleKey: 'guidedTourUpdatesEntryTitle',
    bodyKey: 'guidedTourUpdatesEntryBody',
    placement: 'top',
    optional: true,
  },
  finishStep('guidedTourUpdatesFinishTitle', 'guidedTourUpdatesFinishBody'),
]

const STEPS_BY_CONTEXT: Record<GuidedTourContext, GuidedTourStep[]> = {
  'routes-list': ROUTES_LIST_TOUR_STEPS,
  'route-detail': ROUTE_DETAIL_TOUR_STEPS,
  music: MUSIC_TOUR_STEPS,
  broadcast: BROADCAST_TOUR_STEPS,
  complaints: COMPLAINTS_TOUR_STEPS,
  updates: UPDATES_TOUR_STEPS,
}

/** @deprecated use ROUTES_LIST_TOUR_STEPS */
export const GUIDED_TOUR_STEPS = ROUTES_LIST_TOUR_STEPS

export function getGuidedTourSteps(context: GuidedTourContext): GuidedTourStep[] {
  return STEPS_BY_CONTEXT[context]
}

export function entryForGuidedTourContext(context: GuidedTourContext): GuidedTourContext {
  return context
}

/** @deprecated use entryForGuidedTourContext */
export function entryForGuidedTourMode(mode: GuidedTourContext): GuidedTourContext {
  return entryForGuidedTourContext(mode)
}

export function detectGuidedTourContext(): GuidedTourContext {
  if (readRouteQueryFromLocation()) return 'route-detail'

  const tab = readTabFromLocation() ?? 'routes'
  if (tab === 'routes') return 'routes-list'
  if (tab === 'music') return 'music'
  if (tab === 'broadcast') return 'broadcast'
  if (tab === 'complaints') return 'complaints'
  if (tab === 'updates') return 'updates'
  return 'routes-list'
}

/** @deprecated use detectGuidedTourContext */
export function detectGuidedTourMode(): GuidedTourContext {
  return detectGuidedTourContext()
}

export function resolveReplayGuidedTourContext(): GuidedTourContext {
  if (readRouteQueryFromLocation()) return 'route-detail'
  const tab = readTabFromLocation() ?? 'routes'
  if (tab === 'routes') {
    const detailOpen = document.querySelector('.route-detail-sheet.is-open .route-detail')
    if (detailOpen) return 'route-detail'
    return 'routes-list'
  }
  return detectGuidedTourContext()
}

/** @deprecated use resolveReplayGuidedTourContext */
export function resolveReplayGuidedTourMode(): GuidedTourContext {
  return resolveReplayGuidedTourContext()
}
