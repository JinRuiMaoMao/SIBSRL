import type { MessageKey } from '../i18n/messages'
import { readTabFromLocation } from '../utils/appTabNavigation'
import { readRouteQueryFromLocation } from '../utils/routeNavigation'

export type GuidedTourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'
export type GuidedTourMode = 'full' | 'brief'

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

const TABS_STEP: GuidedTourStep = {
  id: 'tabs',
  target: '.header-tabs-cluster .header-tabs',
  titleKey: 'guidedTourTabsTitle',
  bodyKey: 'guidedTourTabsBody',
  placement: 'bottom',
  beforeShow: expandHeaderIfCollapsed,
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

const FINISH_STEP: GuidedTourStep = {
  id: 'finish',
  titleKey: 'guidedTourFinishTitle',
  bodyKey: 'guidedTourFinishBody',
  placement: 'center',
}

export const GUIDED_TOUR_STEPS: GuidedTourStep[] = [
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
  FINISH_STEP,
]

/** 路线详情、其他标签页、设置等场景使用的精简引导 */
export const GUIDED_TOUR_BRIEF_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome-brief',
    titleKey: 'guidedTourBriefWelcomeTitle',
    bodyKey: 'guidedTourBriefWelcomeBody',
    placement: 'center',
  },
  TABS_STEP,
  {
    id: 'route-detail',
    target: '.route-detail-sheet.is-open',
    titleKey: 'guidedTourRouteDetailTitle',
    bodyKey: 'guidedTourRouteDetailBody',
    placement: 'top',
    optional: true,
  },
  SETTINGS_STEP,
  ACCOUNT_STEP,
  FINISH_STEP,
]

export function getGuidedTourSteps(mode: GuidedTourMode): GuidedTourStep[] {
  return mode === 'brief' ? GUIDED_TOUR_BRIEF_STEPS : GUIDED_TOUR_STEPS
}

export function entryForGuidedTourMode(mode: GuidedTourMode): 'full' | 'brief' {
  return mode === 'full' ? 'full' : 'brief'
}

export function detectGuidedTourMode(): GuidedTourMode {
  const tab = readTabFromLocation() ?? 'routes'
  if (tab !== 'routes') return 'brief'
  if (readRouteQueryFromLocation()) return 'brief'
  return 'full'
}

export function resolveReplayGuidedTourMode(): GuidedTourMode {
  return detectGuidedTourMode() === 'full' ? 'full' : 'brief'
}
