const INDEX_HREF = './index.html'

function redirectIfViewSourceUrl(): boolean {
  const href = window.location.href
  if (/^view-source:/i.test(href) || window.location.protocol === 'view-source:') {
    window.location.replace(INDEX_HREF)
    return true
  }
  return false
}

function isDevToolsShortcut(event: KeyboardEvent): boolean {
  if (event.key === 'F12') return true

  const key = event.key.toUpperCase()
  if (['I', 'J', 'C'].includes(key) && (event.ctrlKey || event.metaKey) && event.shiftKey) {
    return true
  }

  if (key === 'U') {
    if (event.ctrlKey && !event.shiftKey && !event.altKey) return true
    if (event.metaKey && event.altKey) return true
  }

  if (key === 'S' && (event.ctrlKey || event.metaKey)) return true

  return false
}

function blockEvent(event: KeyboardEvent): void {
  if (!isDevToolsShortcut(event)) return
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function blockViewSourceLink(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const link = target.closest('a[href]')
  if (!link) return
  const href = link.getAttribute('href') ?? ''
  if (!/^view-source:/i.test(href)) return
  event.preventDefault()
  event.stopPropagation()
  window.location.replace(INDEX_HREF)
}

/** 发布版拦截 F12、Ctrl+S 保存、查看源代码及 view-source: 前缀（开发模式不启用）。 */
export function installDevToolsBlock(): () => void {
  if (redirectIfViewSourceUrl()) {
    return () => {}
  }

  const keyTypes: Array<keyof WindowEventMap> = ['keydown', 'keyup', 'keypress']

  for (const type of keyTypes) {
    window.addEventListener(type, blockEvent as EventListener, true)
    document.addEventListener(type, blockEvent as EventListener, true)
  }
  document.addEventListener('click', blockViewSourceLink, true)

  return () => {
    for (const type of keyTypes) {
      window.removeEventListener(type, blockEvent as EventListener, true)
      document.removeEventListener(type, blockEvent as EventListener, true)
    }
    document.removeEventListener('click', blockViewSourceLink, true)
  }
}
