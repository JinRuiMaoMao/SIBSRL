import { getLayoutScopedHref, isLayoutScopedPage, isRealLayoutMode } from './appLayoutMode'
import { isRealAppShellPage, readRealShellTab } from './appTabNavigation'

export function getSecretPageHref(): string {
  if (isLayoutScopedPage()) return '../secret.html'
  return './secret.html'
}

export function isStartPage(): boolean {
  if (isRealAppShellPage()) {
    return readRealShellTab() === null
  }

  const meta = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  if (meta === 'start') return true

  const file =
    window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'index.html'
}

export function getStartPageHref(): string {
  if (isLayoutScopedPage()) {
    if (isRealLayoutMode()) return './index.html'
    return '../index.html'
  }
  return './index.html'
}

export function getAccountPageHref(): string {
  return getLayoutScopedHref('account.html')
}

export function getMapDrawPageHref(): string {
  return getLayoutScopedHref('map-draw.html')
}

export function getSettingsPageHref(): string {
  return getLayoutScopedHref('settings.html')
}

export function isSecretPage(): boolean {
  const meta = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  if (meta === 'secret') return true

  const file =
    window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'secret.html'
}

export function isAccountPage(): boolean {
  const meta = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  if (meta === 'account') return true

  const file =
    window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'account.html'
}

export function isSettingsPage(): boolean {
  const meta = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  if (meta === 'settings') return true

  const file =
    window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'settings.html'
}

export function isMapDrawPage(): boolean {
  const meta = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  if (meta === 'map-draw') return true

  const file =
    window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'map-draw.html'
}

export function isRouteMapPage(): boolean {
  const meta = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  if (meta === 'route-map') return true

  const file =
    window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'route-map.html'
}
