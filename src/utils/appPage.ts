export function isSecretPage(): boolean {
  const meta = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  if (meta === 'secret') return true

  const file =
    window.location.pathname.replace(/\\/g, '/').split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'secret.html'
}
