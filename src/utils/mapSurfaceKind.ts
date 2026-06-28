import type { WorldMapVirtualNodeKind } from '../types/worldMapDraw'

/** Map is north-up; grid y decreases toward north. */
export const MAP_NORTH_DIR = 3

export function isBridgeTunnelVirtualKind(kind: WorldMapVirtualNodeKind): boolean {
  return kind === 'on-bridge' || kind === 'off-bridge' || kind === 'enter-tunnel' || kind === 'exit-tunnel'
}

export function isDirectionVirtualKind(kind: WorldMapVirtualNodeKind): boolean {
  return kind === 'straight' || kind === 'left' || kind === 'right'
}
