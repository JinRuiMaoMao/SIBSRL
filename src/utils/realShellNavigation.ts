import type { AppTab } from '../types/appTab'

export const REAL_SHELL_PENDING_TAB_KEY = 'sibs-real-pending-tab'
export const REAL_SHELL_NAV_EVENT = 'sibs-real-shell-nav'

const REAL_SHELL_TABS: AppTab[] = ['routes', 'broadcast', 'music', 'complaints', 'trivia', 'updates']

function isAppTab(value: string): value is AppTab {
  return (REAL_SHELL_TABS as string[]).includes(value)
}

function isRealAppShellPage(): boolean {
  const meta = document.querySelector('meta[name="app-layout-mode"]')?.getAttribute('content')?.trim()
  const layoutReal = meta === 'real' || (!meta && /\/real(?:\/|$)/i.test(window.location.pathname.replace(/\\/g, '/')))
  if (!layoutReal) return false
  const path = window.location.pathname.replace(/\\/g, '/')
  if (!/\/real(?:\/|$)/i.test(path)) return false
  const file = path.split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'index.html' || file === 'real'
}

interface RealShellHistoryState {
  sibsRealTab?: AppTab
}

function readHistoryState(): RealShellHistoryState | null {
  return (window.history.state as RealShellHistoryState | null) ?? null
}

function getRealShellCleanUrl(): string {
  const url = new URL(window.location.href)
  url.hash = ''
  url.searchParams.delete('tab')
  url.searchParams.delete('__realTab')
  return `${url.pathname}${url.search}`
}

function readPendingTab(): AppTab | null {
  try {
    const pending = sessionStorage.getItem(REAL_SHELL_PENDING_TAB_KEY)?.trim()
    if (pending && isAppTab(pending)) return pending
  } catch {
    /* ignore */
  }
  return null
}

function clearPendingTab(): void {
  try {
    sessionStorage.removeItem(REAL_SHELL_PENDING_TAB_KEY)
  } catch {
    /* ignore */
  }
}

export function setRealShellPendingTab(tab: AppTab): void {
  try {
    sessionStorage.setItem(REAL_SHELL_PENDING_TAB_KEY, tab)
  } catch {
    /* ignore */
  }
}

function readLegacyHashTab(): AppTab | null {
  const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
  if (hash && isAppTab(hash)) return hash
  return null
}

function readLegacyQueryTab(): AppTab | null {
  const params = new URLSearchParams(window.location.search)
  const fromTab = params.get('tab')?.trim() ?? params.get('__realTab')?.trim()
  if (fromTab && isAppTab(fromTab)) return fromTab
  return null
}

/** Current Real 壳页栏目；null = 开始页。 */
export function readRealShellTab(): AppTab | null {
  if (!isRealAppShellPage()) return null

  const fromState = readHistoryState()?.sibsRealTab
  if (fromState && isAppTab(fromState)) return fromState

  return null
}

export function isRealShellStartView(): boolean {
  return isRealAppShellPage() && readRealShellTab() === null
}

/** 首屏：迁移旧 hash / ?tab= / sessionStorage，并写 history.state，URL 保持 index。 */
export function bootstrapRealShellNavigation(): void {
  if (!isRealAppShellPage()) return

  const cleanUrl = getRealShellCleanUrl()
  const legacyTab =
    readPendingTab() ?? readLegacyHashTab() ?? readLegacyQueryTab() ?? readRealShellTab()
  clearPendingTab()

  const needsUrlClean =
    window.location.hash.length > 0 ||
    window.location.search.includes('tab=') ||
    window.location.search.includes('__realTab=')

  const nextState: RealShellHistoryState = legacyTab ? { sibsRealTab: legacyTab } : {}

  if (needsUrlClean || legacyTab !== readRealShellTab()) {
    window.history.replaceState(nextState, '', cleanUrl)
  }
}

function notifyRealShellNavigation(): void {
  window.dispatchEvent(new Event(REAL_SHELL_NAV_EVENT))
}

/** 在 Real 壳页内切换栏目或回到开始页；URL 始终为 index。 */
export function navigateRealShellTab(tab: AppTab | null, options?: { replace?: boolean }): void {
  if (!isRealAppShellPage()) {
    if (tab) setRealShellPendingTab(tab)
    window.location.assign(getRealShellIndexHref())
    return
  }

  const url = getRealShellCleanUrl()
  const state: RealShellHistoryState = tab ? { sibsRealTab: tab } : {}

  if (options?.replace) {
    window.history.replaceState(state, '', url)
  } else {
    window.history.pushState(state, '', url)
  }
  notifyRealShellNavigation()
}

export function navigateRealShellStart(options?: { replace?: boolean }): void {
  navigateRealShellTab(null, options)
}

export function getRealShellIndexHref(): string {
  const path = window.location.pathname.replace(/\\/g, '/')
  if (/\/real(?:\/|$)/i.test(path)) return './index.html'
  if (/\/normal(?:\/|$)/i.test(path)) return '../real/index.html'
  return './real/index.html'
}

/** 拦截 Real 壳页内 tab 链接，避免整页刷新。 */
export function handleRealShellTabLink(
  event: { preventDefault: () => void },
  tab: AppTab,
): void {
  if (!isRealAppShellPage()) return
  event.preventDefault()
  navigateRealShellTab(tab)
}
