import { parseRouteMapImportPayload, type RouteMapImportPayload } from './routeMapImportPayload'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

function readDirectionIndex(entry: unknown): number | null {
  if (!isRecord(entry)) return null
  if (typeof entry.directionIndex !== 'number' || !Number.isFinite(entry.directionIndex)) return null
  return Math.round(entry.directionIndex)
}

/** Route map storage: one JSON file may contain multiple direction exports. */
export function isRouteMapImportStorage(raw: unknown): boolean {
  if (!isRecord(raw) || typeof raw.routeId !== 'string') return false
  if (!Array.isArray(raw.directions) || raw.directions.length === 0) return false
  return true
}

export function mergeRouteMapImportStorage(existing: unknown | null, incoming: unknown): unknown {
  if (!isRouteMapImportStorage(incoming)) {
    throw new Error('invalid_route_map_import')
  }

  const routeId = incoming.routeId.trim()
  const byIndex = new Map<number, unknown>()

  if (existing && isRouteMapImportStorage(existing)) {
    for (const entry of existing.directions) {
      const index = readDirectionIndex(entry)
      if (index != null) byIndex.set(index, entry)
    }
  }

  for (const entry of incoming.directions) {
    const index = readDirectionIndex(entry)
    if (index != null) byIndex.set(index, entry)
  }

  const note =
    typeof incoming.note === 'string' && incoming.note.trim()
      ? incoming.note.trim()
      : typeof existing === 'object' &&
          existing != null &&
          typeof (existing as Record<string, unknown>).note === 'string'
        ? String((existing as Record<string, unknown>).note)
        : undefined

  return {
    routeId,
    ...(note ? { note } : {}),
    directions: [...byIndex.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, entry]) => entry),
  }
}

export function listRouteMapImportDirectionIndexes(raw: unknown): number[] {
  if (!isRouteMapImportStorage(raw)) return []
  const indexes = raw.directions
    .map((entry) => readDirectionIndex(entry))
    .filter((index): index is number => index != null)
  return [...new Set(indexes)].sort((left, right) => left - right)
}

export function resolveRouteMapImportPayloadFromStorage(
  raw: unknown,
  directionIndex: number,
): RouteMapImportPayload | null {
  return parseRouteMapImportPayload(raw, directionIndex)
}
