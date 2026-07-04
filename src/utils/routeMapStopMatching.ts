import type { BilingualText } from '../types/route'
import type { RouteEditorNode } from '../routeEditor/types'
import type { RouteDetailMapStop } from './routeDetailMapStops'

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

export function applyCatalogStopSeqToEditorNodes(
  nodes: readonly RouteEditorNode[],
  catalogStops: readonly RouteDetailMapStop[],
): RouteEditorNode[] {
  return nodes.map((node) => {
    if (node.type !== 'stop') return node
    const matched = matchCatalogStopForEditorNode(node, catalogStops)
    if (!matched) return node
    return { ...node, stopSeq: matched.seq }
  })
}

export function buildReferenceStopDetailsFromCatalog(
  nodes: readonly RouteEditorNode[],
  imageSize: { width: number; height: number },
  catalogStops: readonly RouteDetailMapStop[],
): RouteDetailMapStop[] {
  const stopNodes = nodes.filter((node) => node.type === 'stop')
  return stopNodes.map((node, index) => {
    const matched = matchCatalogStopForEditorNode(node, catalogStops)
    return {
      id: `ref-stop-${node.id}`,
      seq: matched?.seq ?? node.stopSeq ?? index + 1,
      stop: matched?.stop ?? { name: { zh: node.chi_name, en: node.eng_name } },
      point: [node.x / imageSize.width, node.y / imageSize.height],
    }
  })
}
