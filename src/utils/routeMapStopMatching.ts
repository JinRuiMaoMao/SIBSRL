import { applyStopNameSubToStop } from '../data/stopNameSubs'
import type { BilingualText, RouteStop } from '../types/route'
import type { RouteEditorNode } from '../routeEditor/types'
import type { RouteDetailMapStop } from './routeDetailMapStops'

export function resolveRouteEditorStopSeqOrderedStops(
  nodes: readonly RouteEditorNode[],
): RouteEditorNode[] {
  const sequenced = nodes.filter((node) => node.type === 'stop' && node.stopSeq != null)
  if (sequenced.length >= 1) {
    return [...sequenced].sort((a, b) => a.stopSeq! - b.stopSeq! || a.id - b.id)
  }
  return nodes.filter((node) => node.type === 'stop')
}

export function resolveRouteEditorStopSeqEndpoints(nodes: readonly RouteEditorNode[]): {
  startNodeId: number | null
  endNodeId: number | null
} {
  const ordered = resolveRouteEditorStopSeqOrderedStops(nodes)
  if (ordered.length >= 2) {
    return { startNodeId: ordered[0]!.id, endNodeId: ordered[ordered.length - 1]!.id }
  }
  if (ordered.length === 1) {
    return { startNodeId: ordered[0]!.id, endNodeId: ordered[0]!.id }
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
    return {
      id: `ref-stop-${node.id}`,
      seq: node.stopSeq != null ? node.stopSeq : index + 1,
      stop: resolveReferenceStopFromEditorNode(node, catalogStops, routeStops),
      point: [node.x / imageSize.width, node.y / imageSize.height],
    }
  })
}
