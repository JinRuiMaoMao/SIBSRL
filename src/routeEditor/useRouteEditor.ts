import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RouteEditorDataManager } from './RouteEditorDataManager'
import type { RouteEditorMode, RouteEditorNodeUpdates, RouteEditorCarriageway } from './types'

export function useRouteEditor(initialLineName = '默认线路') {
  const managerRef = useRef<RouteEditorDataManager | null>(null)
  if (!managerRef.current) {
    managerRef.current = new RouteEditorDataManager(initialLineName)
  }
  const manager = managerRef.current

  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => {
    const offChange = manager.on('change', bump)
    const offHistory = manager.on('historyChange', bump)
    return () => {
      offChange()
      offHistory()
    }
  }, [bump, manager])

  void tick

  const line = manager.getLine()
  const lineStyle = manager.getLineStyle()
  const config = manager.getConfig()
  const history = manager.getHistoryState()

  return useMemo(
    () => ({
      manager,
      line,
      lineStyle,
      config,
      history,
      setLineName: (name: string) => manager.setLineName(name),
      addNode: (
        type: 'stop' | 'point',
        x: number,
        y: number,
        name?: { chi_name?: string; eng_name?: string },
      ) => manager.addNode(type, x, y, name ?? null),
      updateNode: (nodeId: number, updates: RouteEditorNodeUpdates) =>
        manager.updateNode(nodeId, updates),
      deleteNode: (nodeId: number) => manager.deleteNode(nodeId),
      addSegment: (
        fromNodeId: number,
        toNodeId: number,
        carriageway: RouteEditorCarriageway = 'single',
      ) => manager.addSegment(fromNodeId, toNodeId, carriageway),
      deleteSegment: (segmentId: number) => manager.deleteSegment(segmentId),
      clearSegments: () => manager.clearSegments(),
      clearNodes: () => manager.clearNodes(),
      undo: () => manager.undo(),
      redo: () => manager.redo(),
      exportReferenceJson: () => manager.exportReferenceJson(),
      importReferenceJson: (json: string) => manager.importReferenceJson(json),
      replaceFromImport: (importedLine: typeof line, routeId?: string) => {
        manager.replaceLine(importedLine)
        if (routeId?.trim()) manager.setLineName(routeId.trim())
      },
      mergeFromImport: (importedLine: typeof line, routeId?: string) => {
        manager.mergeLine(importedLine)
        if (routeId?.trim()) manager.setLineName(routeId.trim())
      },
    }),
    [config, history, line, lineStyle, manager],
  )
}

export type RouteEditorController = ReturnType<typeof useRouteEditor>

export function modeFromReference(mode: RouteEditorMode): RouteEditorMode {
  return mode
}
