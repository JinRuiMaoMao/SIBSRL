export type AppLayoutMode = 'normal' | 'real'

const LAYOUT_SEGMENT_RE = /\/(normal|real)(?:\/|$)/i
const LAYOUT_SUBDIR_RE = /\/(normal|real|routes)\//i

function siteRootWithTrailingSlash(root: string): string {
  if (!root) return './'
  if (root.endsWith('/')) return root
  return `${root}/`
}

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

/** Asset/audio/map paths: use Vite BASE on GitHub Pages; ../ under normal|real|routes when relative. */
export function getSiteAssetRoot(): string {
  const base = import.meta.env.BASE ?? './'
  const path = window.location.pathname.replace(/\\/g, '/')
  const inLayoutSubdir = LAYOUT_SUBDIR_RE.test(path)
  if (base.startsWith('/')) {
    if (inLayoutSubdir) {
      try {
        return siteRootWithTrailingSlash(new URL('../', window.location.href).pathname)
      } catch {
        return siteRootWithTrailingSlash(base)
      }
    }
    return siteRootWithTrailingSlash(base)
  }
  if (inLayoutSubdir) return '../'
  return './'
}

/** Resolve ./audio/... or audio/... against the site root (handles normal/real subdirs + GitHub Pages BASE). */
export function resolveSiteAssetUrl(relativePath: string): string {
  if (/^(https?:|\/|data:|blob:)/.test(relativePath)) return relativePath
  const clean = relativePath.replace(/^\.\//, '')
  return `${getSiteAssetRoot()}${clean}`
}

export function getIslandMapLayerUrl(layer: 'general' | 'detailed'): string {
  return resolveSiteAssetUrl(
    layer === 'general' ? 'maps/SIMapGerenal.png' : 'maps/SIMap.png',
  )
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
