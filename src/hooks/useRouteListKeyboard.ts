import { useEffect } from 'react'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON'
  )
}

interface UseRouteListKeyboardOptions {
  enabled: boolean
  searchInputId?: string
  onCloseDetail?: () => void
  detailOpen: boolean
}

export function useRouteListKeyboard({
  enabled,
  searchInputId = 'route-search',
  onCloseDetail,
  detailOpen,
}: UseRouteListKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return

      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (isEditableTarget(event.target)) return
        event.preventDefault()
        document.getElementById(searchInputId)?.focus()
        return
      }

      if (event.key === 'Escape' && detailOpen) {
        if (isEditableTarget(event.target)) return
        event.preventDefault()
        onCloseDetail?.()
        return
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      if (detailOpen) return
      if (isEditableTarget(event.target)) return

      const cards = [
        ...document.querySelectorAll<HTMLElement>('.route-card-link[data-route-id]'),
      ].filter((card) => card.offsetParent !== null)
      if (cards.length === 0) return

      const active = document.activeElement
      const currentIndex = cards.findIndex((card) => card === active || card.contains(active))
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex =
        currentIndex === -1
          ? delta > 0
            ? 0
            : cards.length - 1
          : Math.min(cards.length - 1, Math.max(0, currentIndex + delta))

      event.preventDefault()
      cards[nextIndex]?.focus()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [detailOpen, enabled, onCloseDetail, searchInputId])
}
