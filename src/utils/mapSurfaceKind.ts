import type { WorldMapVirtualNodeKind } from '../types/worldMapDraw'

/** Map is north-up; aligned with generalMapRoadSnap NEIGHBORS indices. */
export const COMPASS_DIR = {
  east: 0,
  west: 1,
  south: 2,
  north: 3,
  southeast: 4,
  northeast: 5,
  southwest: 6,
  northwest: 7,
} as const

export const MAP_NORTH_DIR = COMPASS_DIR.north

export const COMPASS_DIRECTION_KINDS = [
  'northwest',
  'north',
  'northeast',
  'west',
  'east',
  'southwest',
  'south',
  'southeast',
] as const satisfies readonly WorldMapVirtualNodeKind[]

/** 3×3 compass rose layout (center cell omitted). */
export const COMPASS_ROSE_LAYOUT: readonly (WorldMapVirtualNodeKind | null)[] = [
  'northwest',
  'north',
  'northeast',
  'west',
  null,
  'east',
  'southwest',
  'south',
  'southeast',
]

export const RELATIVE_DIRECTION_KINDS = ['turn-left', 'turn-right', 'u-turn'] as const satisfies readonly WorldMapVirtualNodeKind[]

export const SURFACE_VIRTUAL_NODE_KINDS = [
  'on-bridge',
  'off-bridge',
  'enter-tunnel',
  'exit-tunnel',
] as const satisfies readonly WorldMapVirtualNodeKind[]

export function isBridgeTunnelVirtualKind(kind: WorldMapVirtualNodeKind): boolean {
  return (SURFACE_VIRTUAL_NODE_KINDS as readonly string[]).includes(kind)
}

export function isDirectionVirtualKind(kind: WorldMapVirtualNodeKind): boolean {
  return (
    (COMPASS_DIRECTION_KINDS as readonly string[]).includes(kind) ||
    (RELATIVE_DIRECTION_KINDS as readonly string[]).includes(kind)
  )
}

export function isAbsoluteDirectionKind(kind: WorldMapVirtualNodeKind): boolean {
  return (COMPASS_DIRECTION_KINDS as readonly string[]).includes(kind)
}

export function absoluteExitDirForKind(kind: WorldMapVirtualNodeKind): number | null {
  switch (kind) {
    case 'north':
      return COMPASS_DIR.north
    case 'south':
      return COMPASS_DIR.south
    case 'west':
      return COMPASS_DIR.west
    case 'east':
      return COMPASS_DIR.east
    case 'northwest':
      return COMPASS_DIR.northwest
    case 'northeast':
      return COMPASS_DIR.northeast
    case 'southwest':
      return COMPASS_DIR.southwest
    case 'southeast':
      return COMPASS_DIR.southeast
    default:
      return null
  }
}

export function normalizeVirtualNodeKind(value: unknown): WorldMapVirtualNodeKind | null {
  if (typeof value !== 'string') return null
  const key = value.trim()
  if (key === 'straight' || key === 'north' || key === '北') return 'north'
  if (key === 'south' || key === '南') return 'south'
  if (key === 'west' || key === '西') return 'west'
  if (key === 'east' || key === '东') return 'east'
  if (key === 'northwest' || key === '西北' || key === '左上') return 'northwest'
  if (key === 'northeast' || key === '东北' || key === '右上') return 'northeast'
  if (key === 'southwest' || key === '西南' || key === '左下') return 'southwest'
  if (key === 'southeast' || key === '东南' || key === '右下') return 'southeast'
  if (key === 'turn-left' || key === 'left' || key === 'turn' || key === '左转') return 'turn-left'
  if (key === 'turn-right' || key === 'right' || key === '右转') return 'turn-right'
  if (key === 'u-turn' || key === '掉头') return 'u-turn'
  if (key === 'on-bridge' || key === '上桥') return 'on-bridge'
  if (key === 'off-bridge' || key === '下桥') return 'off-bridge'
  if (key === 'enter-tunnel' || key === '进隧道' || key === '进隧') return 'enter-tunnel'
  if (key === 'exit-tunnel' || key === '出隧道' || key === '出隧') return 'exit-tunnel'
  return null
}
