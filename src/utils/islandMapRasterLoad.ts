export const ISLAND_MAP_GENERAL_PIXEL_SIZE = 4000
export const ISLAND_MAP_DETAILED_PIXEL_SIZE = 8000

/** Max decoded edge length for the 8000² detailed map on iPad Safari. */
export const ISLAND_MAP_RASTER_DECODE_MAX_EDGE_IPAD = 4096

export function isIPhoneDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPod/i.test(navigator.userAgent)
}

/** iPad and iPadOS “desktop” Safari (MacIntel + touch). */
export function isIPadDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad/i.test(ua)) return true
  if (isIPhoneDevice()) return false
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function getIslandMapRasterDecodeMaxEdge(): number {
  return ISLAND_MAP_RASTER_DECODE_MAX_EDGE_IPAD
}

/** iPad only: downsample the 8000² detailed asset (overview stays native 4000²). */
export function shouldDownsampleIslandMapLayer(layerUrl: string): boolean {
  if (!isIPadDevice()) return false
  const logical = getIslandMapLogicalPixelSize(layerUrl)
  if (!logical) return false
  return logical.width > ISLAND_MAP_GENERAL_PIXEL_SIZE
}

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

async function loadCappedRaster(
  layerUrl: string,
  logicalSize: { width: number; height: number },
): Promise<IslandMapRasterLoadResult> {
  const target = computeCappedRasterSize(
    logicalSize.width,
    logicalSize.height,
    getIslandMapRasterDecodeMaxEdge(),
  )

  const response = await fetch(layerUrl)
  if (!response.ok) {
    throw new Error(`Island map fetch failed: ${response.status}`)
  }
  const blob = await response.blob()

  if (typeof createImageBitmap !== 'function') {
    return { layerUrl, logicalSize, imageSrc: layerUrl }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob, {
      resizeWidth: target.width,
      resizeHeight: target.height,
      resizeQuality: 'high',
    })
  } catch {
    return { layerUrl, logicalSize, imageSrc: layerUrl }
  }

  if (bitmap.width <= 0 || bitmap.height <= 0) {
    bitmap.close()
    return { layerUrl, logicalSize, imageSrc: layerUrl }
  }

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
    canvas.toBlob(resolve, 'image/png')
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

  if (!shouldDownsampleIslandMapLayer(layerUrl)) {
    return { layerUrl, logicalSize, imageSrc: layerUrl }
  }

  return loadCappedRaster(layerUrl, logicalSize)
}

export function islandMapImageMatchesLayerUrl(image: HTMLImageElement, layerUrl: string): boolean {
  if (!layerUrl) return false
  const current = image.currentSrc || image.src
  if (!current) return false
  if (current.startsWith('blob:')) return false
  try {
    const resolvedLayer = new URL(layerUrl, window.location.href).href
    const resolvedCurrent = new URL(current, window.location.href).href
    return resolvedCurrent === resolvedLayer
  } catch {
    return current.includes(layerUrl) || layerUrl.includes(current)
  }
}
