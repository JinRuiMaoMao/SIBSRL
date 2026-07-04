/** 参考 Downloads/index 编辑器的数据模型 */

import type { WorldMapPoint } from '../data/worldMapRoutes'

export type RouteEditorNodeType = 'stop' | 'point'

export type RouteEditorMode = 'select' | 'addStop' | 'addPoint' | 'connectLine'

export type RouteEditorLabelPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'middle-left'
  | 'middle-right'

export interface RouteEditorNode {
  id: number
  chi_name: string
  eng_name: string
  type: RouteEditorNodeType
  x: number
  y: number
  labelPosition: RouteEditorLabelPosition
  labelOffsetX: number
  labelOffsetY: number
  labelWidth: number | 'resize'
  labelHeight: number | 'auto'
  cornerRadius: number
}

export interface RouteEditorSegment {
  id: number
  fromNodeId: number
  toNodeId: number
}

/** Normalized editor graph for SIBS JSON round-trip (preserves manual segment links). */
export interface RouteEditorGraphExportNode {
  id: number
  type: RouteEditorNodeType
  point: WorldMapPoint
  chi_name?: string
  eng_name?: string
  cornerRadius?: number
}

export interface RouteEditorGraphExport {
  nodes: RouteEditorGraphExportNode[]
  segments: Array<{ from: number; to: number }>
}

export interface RouteEditorLine {
  id: number
  name: string
  nodes: RouteEditorNode[]
  segments: RouteEditorSegment[]
}

export interface RouteEditorLineStyle {
  color: string
  width: number
  style: 'solid' | 'dashed' | 'dotted'
}

export interface RouteEditorConfig {
  showLabelsHover: boolean
  showLabelsAlways: boolean
  showStopIcons: boolean
  showPointIcons: boolean
  showBackground: boolean
  showPointLines: boolean
  mapScale: number
  defaultLabelPosition: RouteEditorLabelPosition
  stopIconSize: number
  pointIconSize: number
  labelFontSize: number
}

export const DEFAULT_ROUTE_EDITOR_CONFIG: RouteEditorConfig = {
  showLabelsHover: false,
  showLabelsAlways: true,
  showStopIcons: true,
  showPointIcons: true,
  showBackground: true,
  showPointLines: false,
  mapScale: 1,
  defaultLabelPosition: 'top',
  stopIconSize: 16,
  pointIconSize: 16,
  labelFontSize: 11,
}

export const DEFAULT_ROUTE_EDITOR_LINE_STYLE: RouteEditorLineStyle = {
  color: '#e63757',
  width: 3,
  style: 'solid',
}
