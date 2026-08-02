export const ISLAND_MAP_GENERAL_PIXEL_SIZE = 4000
export const ISLAND_MAP_DETAILED_PIXEL_SIZE = 8000

/** Max decoded edge length on memory-limited WebKit (iPad / iPhone Safari). */
export const ISLAND_MAP_RASTER_DECODE_MAX_EDGE = 4096

export interface IslandMapRasterLoadResult {
  layerUrl: string
  logicalSize: { width: number; height: number }
  imageSrc: string
  revoke?: () => void
}

export function getIslandMapLogicalPixelSize(layerUrl: string): { width: number; height: number } | null {
  if (/SIMapGerenal\.png/i.test(layerUrl)) {
    return { width: ISLAND_MAP_GENERAL_PIXEL_SIZE, height: ISLAND_MAP_GENERAL_PIXEL_SIZE }
  }
  if (/SIMap\.png/i.test(layerUrl)) {
    return { width: ISLAND_MAP_DETAILED_PIXEL_SIZE, height: ISLAND_MAP_DETAILED_PIXEL_SIZE }
  }
  return null
}

export function shouldCapIslandMapRasterDecode(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isAppleMobile =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return isAppleMobile
}

function computeCappedRasterSize(
  logicalWidth: number,
  logicalHeight: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(logicalWidth, logicalHeight)
  if (longest <= maxEdge) {
    return { width: logicalWidth, height: logicalHeight }
  }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(logicalWidth * scale)),
    height: Math.max(1, Math.round(logicalHeight * scale)),
  }
}

async function loadCappedRaster(layerUrl: string, logicalSize: { width: number; height: number }): Promise<IslandMapRasterLoadResult> {
  const target = computeCappedRasterSize(
    logicalSize.width,
    logicalSize.height,
    ISLAND_MAP_RASTER_DECODE_MAX_EDGE,
  )

  const response = await fetch(layerUrl)
  if (!response.ok) {
    throw new Error(`Island map fetch failed: ${response.status}`)
  }
  const blob = await response.blob()

  if (typeof createImageBitmap !== 'function') {
    return { layerUrl, logicalSize, imageSrc: layerUrl }
  }

  const bitmap = await createImageBitmap(blob, {
    resizeWidth: target.width,
    resizeHeight: target.height,
    resizeQuality: 'high',
  })

  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return { layerUrl, logicalSize, imageSrc: layerUrl }
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const outBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  })
  if (!outBlob) {
    return { layerUrl, logicalSize, imageSrc: layerUrl }
  }

  const objectUrl = URL.createObjectURL(outBlob)
  return {
    layerUrl,
    logicalSize,
    imageSrc: objectUrl,
    revoke: () => URL.revokeObjectURL(objectUrl),
  }
}

export async function loadIslandMapRasterForDisplay(layerUrl: string): Promise<IslandMapRasterLoadResult> {
  const logicalSize = getIslandMapLogicalPixelSize(layerUrl)
  if (!logicalSize) {
    return { layerUrl, logicalSize: { width: 0, height: 0 }, imageSrc: layerUrl }
  }

  if (!shouldCapIslandMapRasterDecode()) {
    return { layerUrl, logicalSize, imageSrc: layerUrl }
  }

  const longest = Math.max(logicalSize.width, logicalSize.height)
  if (longest <= ISLAND_MAP_RASTER_DECODE_MAX_EDGE) {
    return { layerUrl, logicalSize, imageSrc: layerUrl }
  }

  return loadCappedRaster(layerUrl, logicalSize)
}

export function islandMapImageMatchesLayerUrl(image: HTMLImageElement, layerUrl: string): boolean {
  if (!layerUrl) return false
  const current = image.currentSrc || image.src
  if (!current) return false
  try {
    const resolvedLayer = new URL(layerUrl, window.location.href).href
    const resolvedCurrent = new URL(current, window.location.href).href
    return resolvedCurrent === resolvedLayer
  } catch {
    return current.includes(layerUrl) || layerUrl.includes(current)
  }
}
