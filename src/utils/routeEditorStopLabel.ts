import { getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import { isChineseLocale } from '../i18n/types'
import type { RouteEditorLabelPosition, RouteEditorNode } from '../routeEditor/types'
import type { WorldMapDrawStop } from '../types/worldMapDraw'

export const MAP_DRAW_STOP_LABEL_POSITIONS = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
] as const
export type MapDrawStopLabelPosition = (typeof MAP_DRAW_STOP_LABEL_POSITIONS)[number]

export interface RouteEditorStopLabelLayout {
  translateX: number
  translateY: number
  rectX: number
  rectY: number
  textX: number
  textY: number
  textAnchor: 'start' | 'middle'
}

export function migrateLegacyLabelPosition(position: RouteEditorLabelPosition): MapDrawStopLabelPosition {
  if (position === 'middle-left') return 'left'
  if (position === 'middle-right') return 'right'
  if ((MAP_DRAW_STOP_LABEL_POSITIONS as readonly string[]).includes(position)) {
    return position as MapDrawStopLabelPosition
  }
  return 'top'
}

export function isActiveStopLabelPosition(
  value: RouteEditorLabelPosition,
  position: MapDrawStopLabelPosition,
): boolean {
  return migrateLegacyLabelPosition(value) === position
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
  const side = migrateLegacyLabelPosition(position)
  const gap = 4 * layout.nodeScale
  const { labelBoxWidth, labelBoxHeight, textInsetX, stopRadius } = layout
  const translateX = layout.labelOffsetX * layout.nodeScale
  const translateY = layout.labelOffsetY * layout.nodeScale
  const textY = (rectY: number) => rectY + labelBoxHeight / 2

  const leftAligned = (rectX: number, rectY: number): RouteEditorStopLabelLayout => ({
    translateX,
    translateY,
    rectX,
    rectY,
    textX: rectX + textInsetX,
    textY: textY(rectY),
    textAnchor: 'start',
  })

  const centerAligned = (rectX: number, rectY: number): RouteEditorStopLabelLayout => ({
    translateX,
    translateY,
    rectX,
    rectY,
    textX: rectX + labelBoxWidth / 2,
    textY: textY(rectY),
    textAnchor: 'middle',
  })

  switch (side) {
    case 'top-left':
      return leftAligned(-stopRadius - gap - labelBoxWidth, -stopRadius - gap - labelBoxHeight)
    case 'top':
      return centerAligned(-labelBoxWidth / 2, -stopRadius - gap - labelBoxHeight)
    case 'top-right':
      return leftAligned(stopRadius + gap, -stopRadius - gap - labelBoxHeight)
    case 'left':
      return leftAligned(-stopRadius - gap - labelBoxWidth, -labelBoxHeight / 2)
    case 'center':
      return centerAligned(-labelBoxWidth / 2, -labelBoxHeight / 2)
    case 'right':
      return leftAligned(stopRadius + gap, -labelBoxHeight / 2)
    case 'bottom-left':
      return leftAligned(-stopRadius - gap - labelBoxWidth, stopRadius + gap)
    case 'bottom':
      return centerAligned(-labelBoxWidth / 2, stopRadius + gap)
    case 'bottom-right':
      return leftAligned(stopRadius + gap, stopRadius + gap)
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

export function drawRouteEditorStopLabelOnCanvas(
  ctx: CanvasRenderingContext2D,
  options: {
    anchorX: number
    anchorY: number
    label: string
    labelPosition: RouteEditorLabelPosition
    fontSize: number
    nodeScale: number
    stopRadius: number
    labelOffsetX?: number
    labelOffsetY?: number
  },
): void {
  const trimmed = options.label.trim()
  if (!trimmed) return

  const labelBoxHeight = 28 * options.nodeScale
  const labelPadding = 4 * options.nodeScale
  const textInsetX = 2 * options.nodeScale
  const cornerRadius = 4 * options.nodeScale
  const labelBoxWidth = measureRouteEditorStopLabelBoxWidth(trimmed, options.fontSize, options.nodeScale, {
    minWidth: 56,
    textInsetX: 2,
    labelPadding: 4,
  })
  const layout = resolveRouteEditorStopLabelLayout(options.labelPosition, {
    labelBoxWidth,
    labelBoxHeight,
    labelPadding,
    textInsetX,
    stopRadius: options.stopRadius,
    nodeScale: options.nodeScale,
    labelOffsetX: options.labelOffsetX ?? 0,
    labelOffsetY: options.labelOffsetY ?? 0,
  })

  const originX = options.anchorX + layout.translateX
  const originY = options.anchorY + layout.translateY
  const boxLeft = originX + layout.rectX
  const boxTop = originY + layout.rectY

  ctx.beginPath()
  ctx.roundRect(boxLeft, boxTop, labelBoxWidth, labelBoxHeight, cornerRadius)
  ctx.fillStyle = MAP_DRAW_EXPORT_STOP_LABEL_PLATE.fill
  ctx.fill()
  ctx.strokeStyle = MAP_DRAW_EXPORT_STOP_LABEL_PLATE.stroke
  ctx.lineWidth = Math.max(1, options.nodeScale)
  ctx.stroke()

  const textX =
    layout.textAnchor === 'middle' ? boxLeft + labelBoxWidth / 2 : boxLeft + textInsetX
  const textY = boxTop + labelBoxHeight / 2

  ctx.font = `${options.fontSize}px ${STOP_LABEL_FONT_FAMILY}`
  ctx.fillStyle = MAP_DRAW_EXPORT_STOP_LABEL_PLATE.text
  ctx.textBaseline = 'middle'
  ctx.textAlign = canvasTextAlign(layout.textAnchor)
  ctx.fillText(trimmed, textX, textY)
  ctx.textAlign = 'start'
}

export function parseRouteEditorLabelPosition(value: unknown): RouteEditorLabelPosition | undefined {
  if (typeof value !== 'string') return undefined
  const allowed: readonly RouteEditorLabelPosition[] = [
    ...MAP_DRAW_STOP_LABEL_POSITIONS,
    'middle-left',
    'middle-right',
  ]
  return allowed.includes(value as RouteEditorLabelPosition)
    ? (value as RouteEditorLabelPosition)
    : undefined
}

function localizedMapDrawStopName(
  zh: string,
  en: string,
  locale: Locale | undefined,
): string {
  const raw = (zh || en || '').trim()
  if (!locale || !isChineseLocale(locale) || !zh) return raw
  return getPrimaryText({ zh, en }, locale) || raw
}

export function formatRouteEditorStopLabel(
  node: Pick<RouteEditorNode, 'chi_name' | 'eng_name' | 'stopSeq'>,
  locale?: Locale,
): string {
  const name = localizedMapDrawStopName(node.chi_name, node.eng_name, locale)
  if (node.stopSeq != null && name) {
    return `${node.stopSeq}. ${name}`
  }
  return name
}

export function formatWorldMapDrawStopEditorLabel(
  stop: Pick<WorldMapDrawStop, 'name' | 'seq'>,
  locale?: Locale,
): string {
  const name = localizedMapDrawStopName(stop.name.zh, stop.name.en, locale)
  if (stop.seq != null && name) {
    return `${stop.seq}. ${name}`
  }
  return name
}

/** PNG export preview plate — matches `.route-editor-app--export-preview` label styling. */
export const MAP_DRAW_EXPORT_STOP_LABEL_PLATE = {
  fill: 'rgba(255, 255, 255, 0.92)',
  stroke: 'rgba(0, 0, 0, 0.35)',
  text: '#111111',
} as const

function canvasTextAlign(textAnchor: RouteEditorStopLabelLayout['textAnchor']): CanvasTextAlign {
  return textAnchor === 'middle' ? 'center' : 'start'
}

export function routeEditorStopLabelShowsSeq(node: Pick<RouteEditorNode, 'stopSeq'>): boolean {
  return node.stopSeq != null
}
