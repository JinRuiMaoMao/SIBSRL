import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'

function rowsEqual(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) return false
  return a.every((row, i) => row.length === b[i]!.length && row.every((tab, j) => tab === b[i]![j]))
}

/**
 * Split header tabs into multiple rounded rows so each row shrink-wraps its buttons
 * without trailing empty space inside the group box.
 */
export function useHeaderTabRows(
  tabs: string[],
  actionsRef: RefObject<HTMLElement | null>,
  settingsRef: RefObject<HTMLElement | null>,
  measureBoxRef: RefObject<HTMLElement | null>,
  measureTabRefs: RefObject<Map<string, HTMLButtonElement>>,
  deps: unknown[] = [],
) {
  const [rows, setRows] = useState<string[][]>(() => [tabs])

  const recompute = useCallback(() => {
    const actions = actionsRef.current
    const measureBox = measureBoxRef.current
    if (!actions || !measureBox) return

    const widths = tabs.map((tab) => measureTabRefs.current?.get(tab)?.offsetWidth ?? 0)
    if (widths.some((w) => w <= 0)) return

    const boxStyle = getComputedStyle(measureBox)
    const boxPaddingX = parseFloat(boxStyle.paddingLeft) + parseFloat(boxStyle.paddingRight)
    const innerGap = parseFloat(boxStyle.gap) || 0
    const actionsStyle = getComputedStyle(actions)
    const actionsGap = parseFloat(actionsStyle.gap) || 0
    const settingsWidth = settingsRef.current?.offsetWidth ?? 0

    const rowOuterWidth = (tabWidths: number[]) =>
      boxPaddingX + tabWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, tabWidths.length - 1) * innerGap

    const nextRows: string[][] = []
    let current: string[] = []
    let currentWidths: number[] = []

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i]!
      const width = widths[i]!
      const candidateWidths = [...currentWidths, width]
      const rowLimit =
        nextRows.length === 0
          ? Math.max(0, actions.clientWidth - settingsWidth - actionsGap)
          : actions.clientWidth

      if (current.length > 0 && rowOuterWidth(candidateWidths) > rowLimit) {
        nextRows.push(current)
        current = [tab]
        currentWidths = [width]
      } else {
        current.push(tab)
        currentWidths = candidateWidths
      }
    }

    if (current.length > 0) nextRows.push(current)

    setRows((prev) => (rowsEqual(prev, nextRows) ? prev : nextRows))
  }, [tabs, actionsRef, settingsRef, measureBoxRef, measureTabRefs])

  useLayoutEffect(() => {
    recompute()

    const actions = actionsRef.current
    if (!actions) return

    const observer = new ResizeObserver(recompute)
    observer.observe(actions)
    if (settingsRef.current) observer.observe(settingsRef.current)

    window.addEventListener('resize', recompute)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [recompute, ...deps])

  return rows
}

export function useMeasureTabRefs() {
  return useRef<Map<string, HTMLButtonElement>>(new Map())
}
