import { applyStopNameSubToStop } from '../data/stopNameSubs'
import type { BilingualText, RouteStop } from '../types/route'
import type { RouteEditorNode } from '../routeEditor/types'
import type { RouteDetailMapStop } from './routeDetailMapStops'

export function resolveRouteEditorStopSeqEndpoints(nodes: readonly RouteEditorNode[]): {
  startNodeId: number | null
  endNodeId: number | null
} {
  const sequenced = nodes.filter((node) => node.type === 'stop' && node.stopSeq != null && node.stopSeq > 0)
  if (sequenced.length >= 1) {
    let minNode = sequenced[0]!
    let maxNode = sequenced[0]!
    for (const node of sequenced) {
      if (node.stopSeq! < minNode.stopSeq!) minNode = node
      if (node.stopSeq! > maxNode.stopSeq!) maxNode = node
    }
    return { startNodeId: minNode.id, endNodeId: maxNode.id }
  }

  const stops = nodes.filter((node) => node.type === 'stop')
  if (stops.length >= 2) {
    return { startNodeId: stops[0]!.id, endNodeId: stops[stops.length - 1]!.id }
  }
  if (stops.length === 1) {
    return { startNodeId: stops[0]!.id, endNodeId: stops[0]!.id }
  }
  return { startNodeId: null, endNodeId: null }
}

export function routeMapStopNamesMatch(a: BilingualText, b: BilingualText): boolean {
  const aZh = a.zh?.trim() ?? ''
  const bZh = b.zh?.trim() ?? ''
  const aEn = a.en?.trim() ?? ''
  const bEn = b.en?.trim() ?? ''
  if (aZh && bZh && aZh === bZh) return true
  if (aEn && bEn && aEn.toLowerCase() === bEn.toLowerCase()) return true
  return false
}

export function matchCatalogStopForEditorNode(
  node: Pick<RouteEditorNode, 'chi_name' | 'eng_name'>,
  catalogStops: readonly RouteDetailMapStop[],
): RouteDetailMapStop | undefined {
  return catalogStops.find((stop) =>
    routeMapStopNamesMatch(stop.stop.name, { zh: node.chi_name, en: node.eng_name }),
  )
}

export function matchRouteStopForEditorNode(
  node: Pick<RouteEditorNode, 'chi_name' | 'eng_name'>,
  routeStops: readonly RouteStop[],
): RouteStop | undefined {
  return routeStops.find((stop) =>
    routeMapStopNamesMatch(stop.name, { zh: node.chi_name, en: node.eng_name }),
  )
}

export function resolveReferenceStopFromEditorNode(
  node: Pick<RouteEditorNode, 'chi_name' | 'eng_name'>,
  catalogStops: readonly RouteDetailMapStop[],
  routeStops: readonly RouteStop[] = [],
): RouteStop {
  const matchedCatalog = matchCatalogStopForEditorNode(node, catalogStops)
  if (matchedCatalog) return applyStopNameSubToStop(matchedCatalog.stop)

  const matchedRoute = matchRouteStopForEditorNode(node, routeStops)
  if (matchedRoute) return applyStopNameSubToStop(matchedRoute)

  return applyStopNameSubToStop({
    name: { zh: node.chi_name, en: node.eng_name },
  })
}

export function applyCatalogStopSeqToEditorNodes(
  nodes: readonly RouteEditorNode[],
  catalogStops: readonly RouteDetailMapStop[],
): RouteEditorNode[] {
  return nodes.map((node) => {
    if (node.type !== 'stop') return node
    if (node.stopSeq != null && node.stopSeq > 0) return node
    const matched = matchCatalogStopForEditorNode(node, catalogStops)
    if (!matched) return node
    return { ...node, stopSeq: matched.seq }
  })
}

export function buildReferenceStopDetailsFromCatalog(
  nodes: readonly RouteEditorNode[],
  imageSize: { width: number; height: number },
  catalogStops: readonly RouteDetailMapStop[],
  routeStops: readonly RouteStop[] = [],
): RouteDetailMapStop[] {
  const stopNodes = nodes.filter((node) => node.type === 'stop')
  return stopNodes.map((node, index) => {
    const matched = matchCatalogStopForEditorNode(node, catalogStops)
    return {
      id: `ref-stop-${node.id}`,
      seq: node.stopSeq ?? matched?.seq ?? index + 1,
      stop: resolveReferenceStopFromEditorNode(node, catalogStops, routeStops),
      point: [node.x / imageSize.width, node.y / imageSize.height],
    }
  })
}
