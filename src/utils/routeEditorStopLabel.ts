import type { RouteEditorNode } from '../routeEditor/types'

const STOP_LABEL_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

let stopLabelMeasureCtx: CanvasRenderingContext2D | null | undefined

function getStopLabelMeasureCtx(): CanvasRenderingContext2D | null {
  if (stopLabelMeasureCtx !== undefined) return stopLabelMeasureCtx
  if (typeof document === 'undefined') {
    stopLabelMeasureCtx = null
    return stopLabelMeasureCtx
  }
  const canvas = document.createElement('canvas')
  stopLabelMeasureCtx = canvas.getContext('2d')
  return stopLabelMeasureCtx
}

export function measureRouteEditorStopLabelBoxWidth(
  label: string,
  fontSize: number,
  scale: number,
  options?: { minWidth?: number; textInsetX?: number; labelPadding?: number },
): number {
  const minWidth = (options?.minWidth ?? 56) * scale
  const textInsetX = (options?.textInsetX ?? 2) * scale
  const labelPadding = (options?.labelPadding ?? 4) * scale
  const horizontalPadding = 2 * (textInsetX + labelPadding)
  const trimmed = label.trim()
  if (!trimmed) return minWidth

  const ctx = getStopLabelMeasureCtx()
  if (ctx) {
    ctx.font = `${fontSize}px ${STOP_LABEL_FONT_FAMILY}`
    return Math.max(minWidth, Math.ceil(ctx.measureText(trimmed).width + horizontalPadding))
  }

  let units = 0
  for (const char of trimmed) {
    units += char.charCodeAt(0) > 0xff ? 1 : 0.55
  }
  return Math.max(minWidth, Math.ceil(units * fontSize * 0.92 + horizontalPadding))
}

export function formatRouteEditorStopLabel(node: Pick<RouteEditorNode, 'chi_name' | 'eng_name' | 'stopSeq'>): string {
  const name = (node.chi_name || node.eng_name || '').trim()
  if (node.stopSeq != null && node.stopSeq > 0 && name) {
    return `${node.stopSeq}. ${name}`
  }
  return name
}

export function routeEditorStopLabelShowsSeq(node: Pick<RouteEditorNode, 'stopSeq'>): boolean {
  return node.stopSeq != null && node.stopSeq > 0
}
