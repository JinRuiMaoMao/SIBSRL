import { useLayoutEffect, type RefObject } from 'react'

/** 按右上角控件实际宽度更新 --header-controls-reserve，避免标签与登录/设置按钮重叠。 */
export function useHeaderControlsReserve(
  shellRef: RefObject<HTMLElement | null>,
  controlsRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const shell = shellRef.current
    const controls = controlsRef.current
    if (!shell || !controls) return

    const apply = () => {
      const shellStyle = getComputedStyle(shell)
      const insetRight =
        parseFloat(shellStyle.getPropertyValue('--header-controls-inset-right')) || 12
      const extraGap = 10
      const reserve = Math.ceil(controls.getBoundingClientRect().width + insetRight + extraGap)
      shell.style.setProperty('--header-controls-reserve', `${reserve}px`)
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(controls)
    window.addEventListener('resize', apply)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
      shell.style.removeProperty('--header-controls-reserve')
    }
  }, [shellRef, controlsRef])
}
