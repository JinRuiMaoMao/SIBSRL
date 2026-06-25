export function isStartPage(): boolean {
  const meta = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  if (meta === 'start') return true

  const file =
    window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'index.html'
}

export function getStartPageHref(): string {
  return './index.html'
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

export function getAccountPageHref(): string {
  return './account.html'
}

export function getSettingsPageHref(): string {
  return './settings.html'
}
