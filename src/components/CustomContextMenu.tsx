import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { isSecretPage } from '../utils/appPage'
import { getTabPageHref, isRoutesPage } from '../utils/appTabNavigation'

const ROBLOX_GAME_URL = 'https://www.roblox.com/games/1588965415'
const MENU_WIDTH = 196
const MENU_ITEM_HEIGHT = 36
const MENU_PADDING = 8

type MenuPoint = { x: number; y: number }

function isNativeContextMenuTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return !!target.closest(
    'input, textarea, select, option, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
  )
}

function clampMenuPosition(x: number, y: number, itemCount: number): MenuPoint {
  const height = MENU_PADDING * 2 + itemCount * MENU_ITEM_HEIGHT
  const maxX = Math.max(8, window.innerWidth - MENU_WIDTH - 8)
  const maxY = Math.max(8, window.innerHeight - height - 8)
  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  }
}

export function CustomContextMenu() {
  const { t } = useLocale()
  const menuId = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<MenuPoint>({ x: 0, y: 0 })

  const showBackToRoutes = isSecretPage() || !isRoutesPage()

  const close = useCallback(() => setOpen(false), [])

  const openAt = useCallback(
    (x: number, y: number) => {
      const itemCount = 3 + (showBackToRoutes ? 1 : 0)
      setPosition(clampMenuPosition(x, y, itemCount))
      setOpen(true)
    },
    [showBackToRoutes],
  )

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (isNativeContextMenuTarget(event.target)) return
      event.preventDefault()
      openAt(event.clientX, event.clientY)
    }

    document.addEventListener('contextmenu', onContextMenu)
    return () => document.removeEventListener('contextmenu', onContextMenu)
  }, [openAt])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onScroll = () => close()

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [close, open])

  const runAction = (action: () => void) => {
    action()
    close()
  }

  if (!open) return null

  return (
    <div
      ref={menuRef}
      id={menuId}
      className="context-menu"
      role="menu"
      aria-label={t('contextMenuAria')}
      style={{ left: position.x, top: position.y }}
    >
      <button
        type="button"
        className="context-menu-item"
        role="menuitem"
        onClick={() => runAction(() => window.location.reload())}
      >
        {t('contextMenuReload')}
      </button>
      <button
        type="button"
        className="context-menu-item"
        role="menuitem"
        onClick={() =>
          runAction(() => {
            void navigator.clipboard?.writeText(window.location.href)
          })
        }
      >
        {t('contextMenuCopyLink')}
      </button>
      {showBackToRoutes ? (
        <button
          type="button"
          className="context-menu-item"
          role="menuitem"
          onClick={() => runAction(() => {
            window.location.href = getTabPageHref('routes')
          })}
        >
          {t('contextMenuBackToRoutes')}
        </button>
      ) : null}
      <button
        type="button"
        className="context-menu-item"
        role="menuitem"
        onClick={() =>
          runAction(() => {
            window.open(ROBLOX_GAME_URL, '_blank', 'noopener,noreferrer')
          })
        }
      >
        {t('contextMenuOpenGame')}
      </button>
    </div>
  )
}
