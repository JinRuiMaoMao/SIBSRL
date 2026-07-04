import { normalizeRouteEditorLine } from './routeEditorPath'
import type { RouteEditorLine, RouteEditorNode, RouteEditorSegment } from './types'

function nodePositionKey(node: RouteEditorNode): string {
  return `${node.type}|${Math.round(node.x)}|${Math.round(node.y)}`
}

function segmentPairKey(fromNodeId: number, toNodeId: number): string {
  return `${fromNodeId}|${toNodeId}`
}

/** 将 incoming 的节点与线段合并进 base（同位置节点复用 ID） */
export function mergeRouteEditorLines(base: RouteEditorLine, incoming: RouteEditorLine): RouteEditorLine {
  const left = normalizeRouteEditorLine(base)
  const right = normalizeRouteEditorLine(incoming)
  const merged: RouteEditorLine = {
    id: left.id,
    name: left.name || right.name,
    nodes: left.nodes.map((node) => ({ ...node })),
    segments: left.segments.map((segment) => ({ ...segment })),
  }

  let nextNodeId = merged.nodes.reduce((max, node) => Math.max(max, node.id), 0) + 1
  let nextSegmentId = merged.segments.reduce((max, segment) => Math.max(max, segment.id), 0) + 1

  const nodeByKey = new Map(merged.nodes.map((node) => [nodePositionKey(node), node.id]))
  const idMap = new Map<number, number>()
  const segmentPairs = new Set(merged.segments.map((segment) => segmentPairKey(segment.fromNodeId, segment.toNodeId)))

  for (const node of right.nodes) {
    const key = nodePositionKey(node)
    const existingId = nodeByKey.get(key)
    if (existingId != null) {
      idMap.set(node.id, existingId)
      continue
    }
    const newNode: RouteEditorNode = { ...node, id: nextNodeId++ }
    merged.nodes.push(newNode)
    nodeByKey.set(key, newNode.id)
    idMap.set(node.id, newNode.id)
  }

  for (const segment of right.segments) {
    const fromNodeId = idMap.get(segment.fromNodeId)
    const toNodeId = idMap.get(segment.toNodeId)
    if (fromNodeId == null || toNodeId == null || fromNodeId === toNodeId) continue
    const pair = segmentPairKey(fromNodeId, toNodeId)
    if (segmentPairs.has(pair)) continue
    const newSegment: RouteEditorSegment = { id: nextSegmentId++, fromNodeId, toNodeId }
    merged.segments.push(newSegment)
    segmentPairs.add(pair)
  }

  return merged
}

export function mergeManyRouteEditorLines(lines: readonly RouteEditorLine[]): RouteEditorLine | null {
  if (lines.length === 0) return null
  return lines.slice(1).reduce((acc, line) => mergeRouteEditorLines(acc, line), normalizeRouteEditorLine(lines[0]!))
}
