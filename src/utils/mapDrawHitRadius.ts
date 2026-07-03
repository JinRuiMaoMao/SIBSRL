/** Stop / path-node pick radius in CSS pixels. */
export const DRAW_STOP_NODE_HIT_PX = 22

/** Bend handle pick radius in CSS pixels. */
export const DRAW_BEND_HIT_PX = 16

/** @deprecated Use DRAW_STOP_NODE_HIT_PX */
export const DRAW_HIT_SCREEN_PX = DRAW_STOP_NODE_HIT_PX

export function imageHitRadiusForScreenPx(screenPx: number, panZoomScale: number): number {
  if (panZoomScale <= 0) return screenPx
  return Math.min(24, Math.max(6, screenPx / panZoomScale))
}

export function imageHitSizeForScreenPx(screenPx: number, panZoomScale: number): number {
  return imageHitRadiusForScreenPx(screenPx, panZoomScale) * 2
}
