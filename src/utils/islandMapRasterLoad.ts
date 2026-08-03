import { getIslandMapLayerUrl } from './appLayoutMode'

export const ISLAND_MAP_GENERAL_PIXEL_SIZE = 4000
export const ISLAND_MAP_DETAILED_PIXEL_SIZE = 8000

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

/** iPad only: avoid decoding the 8000² detailed PNG (Safari OOM). */
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
  /** Overview bitmap shown inside an 8000² logical box (iPad detailed layer). */
  fillLogicalBox: boolean
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

export function loadIslandMapRasterForDisplay(layerUrl: string): IslandMapRasterLoadResult {
  const logicalSize = getIslandMapLogicalPixelSize(layerUrl)
  if (!logicalSize) {
    return {
      layerUrl,
      logicalSize: { width: 0, height: 0 },
      imageSrc: layerUrl,
      fillLogicalBox: false,
    }
  }

  if (shouldDownsampleIslandMapLayer(layerUrl)) {
    return {
      layerUrl,
      logicalSize,
      imageSrc: getIslandMapLayerUrl('general'),
      fillLogicalBox: true,
    }
  }

  return { layerUrl, logicalSize, imageSrc: layerUrl, fillLogicalBox: false }
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
