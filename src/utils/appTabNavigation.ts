import type { AppTab } from '../types/appTab'

export const APP_TABS: AppTab[] = ['routes', 'broadcast', 'music', 'complaints', 'updates']

/** 各栏目对应的根目录 HTML（开发时线路查询用 dev.html） */
const TAB_PAGE_HREF: Record<AppTab, string> = {
  routes: import.meta.env.DEV ? 'dev.html' : 'index.html',
  broadcast: 'ann.html',
  music: 'music.html',
  complaints: 'complaints.html',
  updates: 'updates.html',
}

const FILENAME_TO_TAB: Record<string, AppTab> = {
  'index.html': 'routes',
  'dev.html': 'routes',
  'ann.html': 'broadcast',
  'music.html': 'music',
  'complaints.html': 'complaints',
  'updates.html': 'updates',
}

export function isAppTab(value: string): value is AppTab {
  return (APP_TABS as string[]).includes(value)
}

/** 顶栏链接：线路查询 → index.html，广播 → ann.html，其余同理 */
export function getTabPageHref(tab: AppTab): string {
  return TAB_PAGE_HREF[tab]
}

/** 从 meta、文件名或 legacy ?tab= 读取当前栏目 */
export function readTabFromLocation(): AppTab | null {
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
