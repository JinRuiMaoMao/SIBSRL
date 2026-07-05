/** Editor map zoom: 45% … 3200%. */
export const DRAW_MIN_ZOOM_RATIO = 0.45
export const DRAW_MAX_ZOOM_RATIO = 32

/** Overlay screen lock applies above 100% up through 2800%. */
export const DRAW_OVERLAY_LOCK_ZOOM_MIN = 1
export const DRAW_OVERLAY_LOCK_ZOOM_MAX = 28

/**
 * Counter-scale for the route-editor overlay wrapper.
 * - ≤100%: scale with map (normal shrink when zooming out)
 * - 100%–2800%: constant screen size
 * - >2800%: scale with map again (normal enlarge toward 3200% cap)
 */
export function resolveEditorOverlayWrapScale(
  zoomRatio: number,
  contentScale: number,
  lockOverlayScreenSize: boolean,
): number {
  if (!lockOverlayScreenSize || contentScale <= 0 || !Number.isFinite(zoomRatio)) return 1

  if (zoomRatio <= DRAW_OVERLAY_LOCK_ZOOM_MIN) return 1
  if (zoomRatio > DRAW_OVERLAY_LOCK_ZOOM_MAX) return 1

  return 1 / contentScale
}
