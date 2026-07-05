/** Editor map zoom: 45% … 3200%. */
export const DRAW_MIN_ZOOM_RATIO = 0.45
export const DRAW_MAX_ZOOM_RATIO = 32

/** Overlay screen lock applies above 100% up through 2800%. */
export const DRAW_OVERLAY_LOCK_ZOOM_MIN = 1
export const DRAW_OVERLAY_LOCK_ZOOM_MAX = 28

/**
 * Counter-scale for route-editor overlay visuals (nodes, arrows, labels).
 * - ≤100%: scale with map (normal shrink when zooming out)
 * - 100%–2800%: constant screen size
 * - >2800%: scale with map again (normal enlarge toward 3200% cap)
 *
 * Apply at each element's anchor via `mapDrawAnchorScaleTransform` — a single
 * wrapper scale from (0,0) breaks geographic alignment with the map image.
 */
export function resolveEditorOverlayVisualScale(
  zoomRatio: number,
  contentScale: number,
  lockOverlayScreenSize: boolean,
): number {
  if (!lockOverlayScreenSize || contentScale <= 0 || !Number.isFinite(zoomRatio)) return 1

  if (zoomRatio <= DRAW_OVERLAY_LOCK_ZOOM_MIN) return 1
  if (zoomRatio > DRAW_OVERLAY_LOCK_ZOOM_MAX) return 1

  return 1 / contentScale
}

/** Scale around (cx, cy) so screen size stays constant while the anchor stays on the map. */
export function mapDrawAnchorScaleTransform(
  cx: number,
  cy: number,
  visualScale: number,
): string | undefined {
  if (visualScale === 1 || !Number.isFinite(visualScale)) return undefined
  return `translate(${cx}, ${cy}) scale(${visualScale}) translate(${-cx}, ${-cy})`
}
