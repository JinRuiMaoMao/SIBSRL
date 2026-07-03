/** Target hit radius in CSS pixels — stays constant regardless of map zoom. */
export const DRAW_HIT_SCREEN_PX = 14

export function imageHitRadiusForScreenPx(screenPx: number, panZoomScale: number): number {
  if (panZoomScale <= 0) return screenPx
  return Math.min(24, Math.max(6, screenPx / panZoomScale))
}

export function imageHitSizeForScreenPx(screenPx: number, panZoomScale: number): number {
  return imageHitRadiusForScreenPx(screenPx, panZoomScale) * 2
}
