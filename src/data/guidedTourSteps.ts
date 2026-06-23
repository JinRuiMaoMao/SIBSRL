import type { MessageKey } from '../i18n/messages'

export type GuidedTourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

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

export const GUIDED_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'welcome',
    titleKey: 'guidedTourWelcomeTitle',
    bodyKey: 'guidedTourWelcomeBody',
    placement: 'center',
  },
  {
    id: 'tabs',
    target: '[data-tour="header-tabs"]',
    titleKey: 'guidedTourTabsTitle',
    bodyKey: 'guidedTourTabsBody',
    placement: 'bottom',
    beforeShow: () => {
      const shell = document.querySelector('.site-header-shell.is-collapsed')
      if (shell) {
        const toggle = document.querySelector('.header-collapse-toggle')
        if (toggle instanceof HTMLButtonElement) toggle.click()
      }
    },
  },
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
  {
    id: 'settings',
    target: '[data-tour="settings"]',
    titleKey: 'guidedTourSettingsTitle',
    bodyKey: 'guidedTourSettingsBody',
    placement: 'left',
  },
  {
    id: 'account',
    target: '[data-tour="account"]',
    titleKey: 'guidedTourAccountTitle',
    bodyKey: 'guidedTourAccountBody',
    placement: 'left',
  },
  {
    id: 'finish',
    titleKey: 'guidedTourFinishTitle',
    bodyKey: 'guidedTourFinishBody',
    placement: 'center',
  },
]
