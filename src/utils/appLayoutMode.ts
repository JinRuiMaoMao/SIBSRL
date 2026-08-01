export type AppLayoutMode = 'normal' | 'real'

const LAYOUT_SEGMENT_RE = /\/(normal|real)(?:\/|$)/i

export function readAppLayoutMode(): AppLayoutMode {
  const meta = document.querySelector('meta[name="app-layout-mode"]')?.getAttribute('content')?.trim()
  if (meta === 'real' || meta === 'normal') return meta

  const path = window.location.pathname.replace(/\\/g, '/')
  const match = path.match(LAYOUT_SEGMENT_RE)
  if (match?.[1]?.toLowerCase() === 'real') return 'real'
  if (match?.[1]?.toLowerCase() === 'normal') return 'normal'
  return 'normal'
}

export function isRealLayoutMode(): boolean {
  return readAppLayoutMode() === 'real'
}

export function isLayoutScopedPage(): boolean {
  return LAYOUT_SEGMENT_RE.test(window.location.pathname.replace(/\\/g, '/'))
}

/** Asset/audio/map paths: use Vite BASE on GitHub Pages; ../ under normal|real when relative. */
export function getSiteAssetRoot(): string {
  const base = import.meta.env.BASE ?? './'
  if (base.startsWith('/')) {
    return base.endsWith('/') ? base : `${base}/`
  }
  return isLayoutScopedPage() ? '../' : './'
}

export function getLayoutScopedHref(filename: string): string {
  const clean = filename.replace(/^\.\//, '')
  if (isLayoutScopedPage()) return `./${clean}`
  return `./${readAppLayoutMode()}/${clean}`
}

export function getAlternateLayoutMode(): AppLayoutMode {
  return isRealLayoutMode() ? 'normal' : 'real'
}

export function getAlternateLayoutRoutesHref(): string {
  return getLayoutRoutesHref(getAlternateLayoutMode())
}

export function getLayoutRoutesHref(mode: AppLayoutMode): string {
  const routesFile = import.meta.env.DEV ? 'dev.html' : 'routes.html'
  if (isLayoutScopedPage()) return `../${mode}/${routesFile}`
  return `./${mode}/${routesFile}`
}

export function applyAppLayoutModeAttributes(): void {
  const mode = readAppLayoutMode()
  document.documentElement.setAttribute('data-app-layout-mode', mode)
  document.documentElement.setAttribute('data-route-lookup-layout', mode === 'real' ? 'split' : 'grid')
}
