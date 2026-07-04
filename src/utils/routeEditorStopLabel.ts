import type { RouteEditorLabelPosition, RouteEditorNode } from '../routeEditor/types'

export const MAP_DRAW_STOP_LABEL_POSITIONS = ['top', 'bottom', 'left', 'right'] as const
export type MapDrawStopLabelPosition = (typeof MAP_DRAW_STOP_LABEL_POSITIONS)[number]

export interface RouteEditorStopLabelLayout {
  translateX: number
  translateY: number
  rectX: number
  rectY: number
  textX: number
  textY: number
}

export function normalizeRouteEditorLabelPosition(
  position: RouteEditorLabelPosition,
): MapDrawStopLabelPosition {
  if (position === 'middle-left') return 'left'
  if (position === 'middle-right') return 'right'
  return position
}

export function resolveRouteEditorStopLabelLayout(
  position: RouteEditorLabelPosition,
  layout: {
    labelBoxWidth: number
    labelBoxHeight: number
    labelPadding: number
    textInsetX: number
    stopRadius: number
    nodeScale: number
    labelOffsetX: number
    labelOffsetY: number
  },
): RouteEditorStopLabelLayout {
  const side = normalizeRouteEditorLabelPosition(position)
  const gap = 4 * layout.nodeScale
  const { labelBoxWidth, labelBoxHeight, labelPadding, textInsetX, stopRadius } = layout
  const translateX = layout.labelOffsetX * layout.nodeScale
  const translateY = layout.labelOffsetY * layout.nodeScale
  const textY = (rectY: number) => rectY + labelBoxHeight / 2

  switch (side) {
    case 'top':
      return {
        translateX,
        translateY,
        rectX: -labelPadding,
        rectY: -stopRadius - gap - labelBoxHeight,
        textX: textInsetX,
        textY: textY(-stopRadius - gap - labelBoxHeight),
      }
    case 'bottom':
      return {
        translateX,
        translateY,
        rectX: -labelPadding,
        rectY: stopRadius + gap,
        textX: textInsetX,
        textY: textY(stopRadius + gap),
      }
    case 'left':
      return {
        translateX,
        translateY,
        rectX: -stopRadius - gap - labelBoxWidth,
        rectY: -labelBoxHeight / 2,
        textX: -stopRadius - gap - labelBoxWidth + textInsetX,
        textY: textY(-labelBoxHeight / 2),
      }
    case 'right':
      return {
        translateX,
        translateY,
        rectX: stopRadius + gap,
        rectY: -labelBoxHeight / 2,
        textX: stopRadius + gap + textInsetX,
        textY: textY(-labelBoxHeight / 2),
      }
  }
}

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
