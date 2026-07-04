import {
  DEFAULT_ROUTE_EDITOR_CONFIG,
  DEFAULT_ROUTE_EDITOR_LINE_STYLE,
  type RouteEditorConfig,
  type RouteEditorLabelPosition,
  type RouteEditorLine,
  type RouteEditorLineStyle,
  type RouteEditorNode,
  type RouteEditorNodeType,
} from './types'
import { inferSegmentsFromOrderedNodes, normalizeRouteEditorLine } from './routeEditorPath'
import { mergeRouteEditorLines } from './routeEditorMerge'

type RouteEditorEvent = 'change' | 'historyChange'

interface RouteEditorHistoryState {
  line: RouteEditorLine
  nextNodeId: number
  nextSegmentId: number
  lineStyle: RouteEditorLineStyle
  config: RouteEditorConfig
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createEmptyLine(lineName: string): RouteEditorLine {
  return { id: 1, name: lineName, nodes: [], segments: [] }
}

/** 参考 Downloads/index/route-data-manager.js（单线路版，线段需手动连接） */
export class RouteEditorDataManager {
  private line: RouteEditorLine
  private lineStyle: RouteEditorLineStyle
  private config: RouteEditorConfig
  private nextNodeId = 1
  private nextSegmentId = 1
  private history: RouteEditorHistoryState[] = []
  private historyIndex = -1
  private listeners = new Map<RouteEditorEvent, Set<() => void>>()

  constructor(lineName = '默认线路') {
    this.line = createEmptyLine(lineName)
    this.lineStyle = { ...DEFAULT_ROUTE_EDITOR_LINE_STYLE }
    this.config = { ...DEFAULT_ROUTE_EDITOR_CONFIG }
    this.saveHistory()
  }

  on(event: RouteEditorEvent, callback: () => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(callback)
    return () => this.listeners.get(event)?.delete(callback)
  }

  private emit(event: RouteEditorEvent) {
    this.listeners.get(event)?.forEach((callback) => callback())
  }

  private saveHistory() {
    const state: RouteEditorHistoryState = {
      line: clone(this.line),
      nextNodeId: this.nextNodeId,
      nextSegmentId: this.nextSegmentId,
      lineStyle: clone(this.lineStyle),
      config: clone(this.config),
    }
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1)
    }
    this.history.push(state)
    this.historyIndex = this.history.length - 1
    if (this.history.length > 50) {
      this.history.shift()
      this.historyIndex -= 1
    }
    this.emit('historyChange')
  }

  getLine(): RouteEditorLine {
    return clone(this.line)
  }

  getLineStyle(): RouteEditorLineStyle {
    return clone(this.lineStyle)
  }

  getConfig(): RouteEditorConfig {
    return clone(this.config)
  }

  getHistoryState(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.historyIndex,
      redoCount: this.history.length - 1 - this.historyIndex,
    }
  }

  setLineName(name: string) {
    const trimmed = name.trim()
    if (!trimmed || trimmed === this.line.name) return
    this.line.name = trimmed
    this.saveHistory()
    this.emit('change')
  }

  updateLineStyle(style: Partial<RouteEditorLineStyle>) {
    this.lineStyle = {
      ...this.lineStyle,
      color: DEFAULT_ROUTE_EDITOR_LINE_STYLE.color,
      width: style.width ?? this.lineStyle.width,
      style: style.style ?? this.lineStyle.style,
    }
    this.saveHistory()
    this.emit('change')
  }

  updateConfig(config: Partial<RouteEditorConfig>) {
    this.config = { ...this.config, ...config }
    this.emit('change')
  }

  generateRandomName(type: RouteEditorNodeType): { chi_name: string; eng_name: string } {
    if (type === 'stop') {
      const stopCount = this.line.nodes.filter((node) => node.type === 'stop').length + 1
      return { chi_name: `站点${stopCount}`, eng_name: `Stop ${stopCount}` }
    }
    return { chi_name: '', eng_name: '' }
  }

  addNode(
    type: RouteEditorNodeType,
    x: number,
    y: number,
    name: { chi_name?: string; eng_name?: string } | null = null,
    labelPosition: RouteEditorLabelPosition | null = null,
  ): RouteEditorNode {
    let nodeNames = { chi_name: '', eng_name: '' }
    if (type === 'stop') {
      if (name?.chi_name?.trim()) {
        nodeNames = { chi_name: name.chi_name.trim(), eng_name: name.eng_name?.trim() || '' }
      } else {
        nodeNames = this.generateRandomName(type)
      }
    }

    const newNode: RouteEditorNode = {
      id: this.nextNodeId++,
      chi_name: nodeNames.chi_name,
      eng_name: nodeNames.eng_name,
      type,
      x: Math.round(x),
      y: Math.round(y),
      labelPosition: labelPosition || this.config.defaultLabelPosition,
      labelOffsetX: 0,
      labelOffsetY: 0,
      labelWidth: 80,
      labelHeight: 'auto',
      cornerRadius: 0,
    }

    this.line.nodes.push(newNode)
    this.saveHistory()
    this.emit('change')
    return clone(newNode)
  }

  getNodeById(nodeId: number): RouteEditorNode | null {
    const node = this.line.nodes.find((entry) => entry.id === nodeId)
    return node ? clone(node) : null
  }

  updateNode(nodeId: number, updates: Partial<RouteEditorNode>): boolean {
    const node = this.line.nodes.find((entry) => entry.id === nodeId)
    if (!node) return false

    if (node.type === 'stop') {
      if (updates.chi_name !== undefined) node.chi_name = updates.chi_name.trim()
      if (updates.eng_name !== undefined) node.eng_name = updates.eng_name.trim()
      if (updates.labelPosition !== undefined) node.labelPosition = updates.labelPosition
      if (updates.labelOffsetX !== undefined) node.labelOffsetX = updates.labelOffsetX
      if (updates.labelOffsetY !== undefined) node.labelOffsetY = updates.labelOffsetY
      if (updates.labelWidth !== undefined) node.labelWidth = updates.labelWidth
      if (updates.labelHeight !== undefined) node.labelHeight = updates.labelHeight
    }

    if (updates.x !== undefined) node.x = Math.round(updates.x)
    if (updates.y !== undefined) node.y = Math.round(updates.y)
    if (updates.cornerRadius !== undefined) {
      node.cornerRadius = Math.max(0, Math.min(100, Math.round(updates.cornerRadius)))
    }

    this.saveHistory()
    this.emit('change')
    return true
  }

  private removeSegmentsForNode(nodeId: number) {
    this.line.segments = this.line.segments.filter(
      (segment) => segment.fromNodeId !== nodeId && segment.toNodeId !== nodeId,
    )
  }

  deleteNode(nodeId: number): boolean {
    const index = this.line.nodes.findIndex((entry) => entry.id === nodeId)
    if (index < 0) return false
    this.line.nodes.splice(index, 1)
    this.removeSegmentsForNode(nodeId)
    this.saveHistory()
    this.emit('change')
    return true
  }

  addSegment(fromNodeId: number, toNodeId: number): boolean {
    if (fromNodeId === toNodeId) return false
    const fromNode = this.line.nodes.find((node) => node.id === fromNodeId)
    const toNode = this.line.nodes.find((node) => node.id === toNodeId)
    if (!fromNode || !toNode) return false
    const exists = this.line.segments.some(
      (segment) => segment.fromNodeId === fromNodeId && segment.toNodeId === toNodeId,
    )
    if (exists) return false

    this.line.segments.push({
      id: this.nextSegmentId++,
      fromNodeId,
      toNodeId,
    })
    this.saveHistory()
    this.emit('change')
    return true
  }

  deleteSegment(segmentId: number): boolean {
    const index = this.line.segments.findIndex((segment) => segment.id === segmentId)
    if (index < 0) return false
    this.line.segments.splice(index, 1)
    this.saveHistory()
    this.emit('change')
    return true
  }

  clearSegments() {
    if (this.line.segments.length === 0) return
    this.line.segments = []
    this.saveHistory()
    this.emit('change')
  }

  clearNodes() {
    if (this.line.nodes.length === 0 && this.line.segments.length === 0) return
    this.line.nodes = []
    this.line.segments = []
    this.saveHistory()
    this.emit('change')
  }

  replaceLine(line: RouteEditorLine, style?: RouteEditorLineStyle) {
    this.line = normalizeRouteEditorLine(clone(line))
    if (style) this.lineStyle = clone(style)
    const maxNodeId = this.line.nodes.reduce((max, node) => Math.max(max, node.id), 0)
    const maxSegmentId = this.line.segments.reduce((max, segment) => Math.max(max, segment.id), 0)
    this.nextNodeId = maxNodeId + 1
    this.nextSegmentId = maxSegmentId + 1
    this.saveHistory()
    this.emit('change')
  }

  mergeLine(incoming: RouteEditorLine) {
    this.line = mergeRouteEditorLines(this.line, incoming)
    const maxNodeId = this.line.nodes.reduce((max, node) => Math.max(max, node.id), 0)
    const maxSegmentId = this.line.segments.reduce((max, segment) => Math.max(max, segment.id), 0)
    this.nextNodeId = Math.max(this.nextNodeId, maxNodeId + 1)
    this.nextSegmentId = Math.max(this.nextSegmentId, maxSegmentId + 1)
    this.saveHistory()
    this.emit('change')
  }

  undo(): boolean {
    if (this.historyIndex <= 0) return false
    this.historyIndex -= 1
    this.restoreHistory(this.history[this.historyIndex]!)
    this.emit('change')
    this.emit('historyChange')
    return true
  }

  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false
    this.historyIndex += 1
    this.restoreHistory(this.history[this.historyIndex]!)
    this.emit('change')
    this.emit('historyChange')
    return true
  }

  private restoreHistory(state: RouteEditorHistoryState) {
    this.line = clone(state.line)
    this.nextNodeId = state.nextNodeId
    this.nextSegmentId = state.nextSegmentId
    this.lineStyle = clone(state.lineStyle)
    this.config = clone(state.config)
  }

  exportReferenceJson(): string {
    const payload = {
      version: '1.0',
      lines: [clone(this.line)],
      lineStyles: { [String(this.line.id)]: clone(this.lineStyle) },
      config: clone(this.config),
      currentLineId: this.line.id,
      nextLineId: 2,
      nextNodeId: this.nextNodeId,
      nextSegmentId: this.nextSegmentId,
    }
    return JSON.stringify(payload, null, 2)
  }

  importReferenceJson(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData) as {
        version?: string
        lines?: RouteEditorLine[]
        lineStyles?: Record<string, RouteEditorLineStyle>
        config?: Partial<RouteEditorConfig>
        nextSegmentId?: number
      }
      if (!parsed.version || !Array.isArray(parsed.lines) || parsed.lines.length === 0) {
        return false
      }
      const line = normalizeRouteEditorLine(clone(parsed.lines[0]!))
      for (const node of line.nodes) {
        if (node.type === 'point') {
          node.chi_name = ''
          node.eng_name = ''
        }
        node.cornerRadius = node.cornerRadius ?? 0
      }
      this.line = line
      const style = parsed.lineStyles?.[String(line.id)]
      this.lineStyle = style
        ? { ...DEFAULT_ROUTE_EDITOR_LINE_STYLE, ...style, color: DEFAULT_ROUTE_EDITOR_LINE_STYLE.color }
        : { ...DEFAULT_ROUTE_EDITOR_LINE_STYLE }
      if (parsed.config) {
        this.config = { ...DEFAULT_ROUTE_EDITOR_CONFIG, ...parsed.config }
      }
      this.nextNodeId = line.nodes.reduce((max, node) => Math.max(max, node.id), 0) + 1
      this.nextSegmentId =
        parsed.nextSegmentId ??
        line.segments.reduce((max, segment) => Math.max(max, segment.id), 0) + 1
      this.history = []
      this.historyIndex = -1
      this.saveHistory()
      this.emit('change')
      return true
    } catch {
      return false
    }
  }
}
