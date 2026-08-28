import type { AppTab } from '../types/appTab'
import { getLayoutScopedHref, isLayoutScopedPage, isNormalLayoutScopedPage, isRealLayoutMode, isRealLayoutScopedPage, readAppLayoutMode } from './appLayoutMode'

export const APP_TABS: AppTab[] = ['routes', 'broadcast', 'music', 'complaints', 'trivia', 'updates']

/** 线路查询页文件名（开发 dev.html，发布 routes.html） */
export function getRoutesPageFile(): string {
  return import.meta.env.DEV ? 'dev.html' : 'routes.html'
}

/** 各栏目对应的 HTML 文件名 */
const TAB_PAGE_FILE: Record<AppTab, string> = {
  routes: getRoutesPageFile(),
  broadcast: 'ann.html',
  music: 'music.html',
  complaints: 'complaints.html',
  trivia: 'trivia.html',
  updates: 'updates.html',
}

const FILENAME_TO_TAB: Record<string, AppTab> = {
  'routes.html': 'routes',
  'dev.html': 'routes',
  'ann.html': 'broadcast',
  'music.html': 'music',
  'complaints.html': 'complaints',
  'trivia.html': 'trivia',
  'updates.html': 'updates',
}

export function isAppTab(value: string): value is AppTab {
  return (APP_TABS as string[]).includes(value)
}

/** Real 分屏壳页：real/ 或 real/index.html，栏目由 hash 切换。 */
export function isRealAppShellPage(): boolean {
  if (!isRealLayoutMode()) return false
  const path = window.location.pathname.replace(/\\/g, '/')
  if (!/\/real(?:\/|$)/i.test(path)) return false
  const file = path.split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  return file === 'index.html' || file === 'real'
}

export function readRealTabFromHash(): AppTab | null {
  const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
  if (hash && isAppTab(hash)) return hash
  return null
}

function getRealShellHref(tab: AppTab): string {
  if (isRealAppShellPage()) return `#${tab}`
  if (isRealLayoutScopedPage()) return `./index.html#${tab}`
  if (isNormalLayoutScopedPage()) return `../real/index.html#${tab}`
  return `./real/index.html#${tab}`
}

/** normal 各栏目独立 HTML；real 分屏统一 real/index.html#栏目。 */
export function getTabPageHref(tab: AppTab): string {
  if (isRealLayoutMode()) return getRealShellHref(tab)
  return getLayoutScopedHref(TAB_PAGE_FILE[tab])
}

/** 从 hash（real 壳页）、meta、路径或 legacy ?tab= 读取当前栏目 */
export function readTabFromLocation(): AppTab | null {
  if (isRealAppShellPage()) {
    return readRealTabFromHash()
  }

  const meta = document.querySelector('meta[name="app-tab"]')?.getAttribute('content')?.trim()
  if (meta && isAppTab(meta)) return meta

  const path = window.location.pathname.replace(/\\/g, '/')
  const file = path.split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
  const fromFile = FILENAME_TO_TAB[file]
  if (fromFile) return fromFile

  const fromQuery = new URLSearchParams(window.location.search).get('tab')?.trim()
  if (fromQuery && isAppTab(fromQuery)) return fromQuery

  return null
}

export function isRoutesPage(): boolean {
  return (readTabFromLocation() ?? 'routes') === 'routes'
}

export function getStartPageHrefForLayout(mode = readAppLayoutMode()): string {
  if (isLayoutScopedPage()) return './index.html'
  if (mode === 'real') return './real/index.html'
  return './index.html'
}
