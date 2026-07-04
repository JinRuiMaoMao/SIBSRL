import type { RouteEditorNode } from '../routeEditor/types'

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
