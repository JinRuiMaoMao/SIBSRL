import { isRouteListUnderStickyToolbar } from '../utils/dailyChallengeStickyOverlap'
import { useEffect, useState, type RefObject } from 'react'

/**
 * 列表内容上滑进入置顶搜索栏区域时，为搜索栏启用底部渐变蒙版。
 */
export function useRouteLookupStickyFade(stickyRef: RefObject<HTMLElement | null>): boolean {
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const sticky = stickyRef.current
    if (!sticky) return

    const sync = () => {
      setFade(isRouteListUnderStickyToolbar(sticky))
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)

    const ro = new ResizeObserver(sync)
    ro.observe(sticky)

    const page = sticky.closest('.route-lookup-page')
    const list = page?.querySelector('.route-list-section')
    if (list) ro.observe(list)

    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      ro.disconnect()
    }
  }, [stickyRef])

  return fade
}
