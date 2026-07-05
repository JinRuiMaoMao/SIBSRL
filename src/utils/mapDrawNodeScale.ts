/** SIMap.png (detailed layer) native pixel width/height. */
export const MAP_DRAW_DETAILED_IMAGE_SIZE = 8000

/** Stop / bend-point icon sizes tuned for the detailed map layer. */
export const MAP_DRAW_BASE_STOP_ICON_SIZE = 16
export const MAP_DRAW_BASE_POINT_ICON_SIZE = 16

/** Scale editor node visuals so overview (4000²) matches detailed (8000²) appearance. */
export function mapDrawNodeScaleFactor(imageWidth: number, imageHeight: number): number {
  if (imageWidth <= 0 || imageHeight <= 0) return 1
  return Math.min(imageWidth, imageHeight) / MAP_DRAW_DETAILED_IMAGE_SIZE
}

export function mapDrawStopIconRadius(stopIconSize: number, scale: number): number {
  return Math.max(6, stopIconSize / 2) * scale
}

export function mapDrawPointIconRadius(pointIconSize: number, scale: number): number {
  return Math.max(5, pointIconSize / 2) * scale
}
