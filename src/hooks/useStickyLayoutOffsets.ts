import { useEffect } from 'react'

/** 供置顶搜索栏、手机端筛选抽屉计算 top 偏移 */
export function useStickyLayoutOffsets(
  headerSelector = '.site-header',
  toolbarSelector = '.route-lookup-sticky',
) {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(headerSelector)
    const toolbar = document.querySelector<HTMLElement>(toolbarSelector)
    if (!header) return

    const sync = () => {
      const headerH = header.getBoundingClientRect().height
      document.documentElement.style.setProperty('--site-header-sticky-offset', `${headerH}px`)
      const toolbarH = toolbar?.getBoundingClientRect().height ?? 0
      document.documentElement.style.setProperty('--route-toolbar-height', `${toolbarH}px`)
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(header)
    if (toolbar) ro.observe(toolbar)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [headerSelector, toolbarSelector])
}
