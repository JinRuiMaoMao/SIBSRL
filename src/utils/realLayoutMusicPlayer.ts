import { musicTracks } from '../data/musicTracks'
import { resolveSiteAssetUrl } from './appLayoutMode'
import {
  getRealLayoutMusicCompositeConfig,
  type RealLayoutMusicCompositeConfig,
} from './realLayoutMusicComposite'
import { readRealMusicMuted, type RealLayoutMusicTrackId } from './realLayoutMusicStorage'

declare global {
  interface Window {
    __SIBS_REAL_LAYOUT_AUDIO__?: HTMLAudioElement
  }
}

function resolveMusicTrackUrl(trackId: RealLayoutMusicTrackId): string | null {
  const track = musicTracks.find((entry) => entry.id === trackId)
  if (!track) return null
  return resolveSiteAssetUrl(track.audioUrl.replace(/^\.\//, ''))
}

function resolveCompositeAssetUrl(asset: string): string {
  return resolveSiteAssetUrl(asset.replace(/^\.\//, ''))
}

function readDefaultRealTrackId(): RealLayoutMusicTrackId {
  const page = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  return page === 'start' ? 'music-main-menu' : 'music-map-menu'
}

let audio: HTMLAudioElement | null = null
let currentTrackId: RealLayoutMusicTrackId | null = null
let gestureUnlockInstalled = false
let compositeConfig: RealLayoutMusicCompositeConfig | null = null
let compositeSegmentIndex = 0
let compositeTimeUpdateHandler: (() => void) | null = null
let compositeEndedHandler: (() => void) | null = null

function adoptEarlyAudio(): HTMLAudioElement | null {
  const early = window.__SIBS_REAL_LAYOUT_AUDIO__
  if (!(early instanceof HTMLAudioElement)) return null
  audio = early
  delete window.__SIBS_REAL_LAYOUT_AUDIO__
  return audio
}

function getOrCreateAudio(): HTMLAudioElement {
  if (audio) return audio
  const adopted = adoptEarlyAudio()
  if (adopted) return adopted

  audio = new Audio()
  audio.loop = true
  audio.preload = 'auto'
  return audio
}

function clearCompositeHandlers(): void {
  const element = audio
  if (!element) return
  if (compositeTimeUpdateHandler) {
    element.removeEventListener('timeupdate', compositeTimeUpdateHandler)
    compositeTimeUpdateHandler = null
  }
  if (compositeEndedHandler) {
    element.removeEventListener('ended', compositeEndedHandler)
    compositeEndedHandler = null
  }
  compositeConfig = null
  compositeSegmentIndex = 0
}

function playCompositeSegment(index: number, config: RealLayoutMusicCompositeConfig): void {
  const element = getOrCreateAudio()
  const segment = config.segments[index]
  if (!segment) {
    if (config.loop && config.segments.length > 0) {
      playCompositeSegment(0, config)
    }
    return
  }

  compositeSegmentIndex = index
  clearCompositeHandlers()
  compositeConfig = config

  element.loop = false
  element.pause()
  element.src = resolveCompositeAssetUrl(segment.asset)

  const startAt = segment.startAt ?? 0
  const beginPlayback = () => {
    try {
      element.currentTime = startAt
    } catch {
      /* metadata may still be loading */
    }
    if (!readRealMusicMuted()) {
      void element.play().catch(() => {})
    }
  }

  if (segment.endAt != null) {
    compositeTimeUpdateHandler = () => {
      if (element.currentTime >= segment.endAt! - 0.05) {
        const nextIndex = index + 1
        if (nextIndex < config.segments.length) {
          playCompositeSegment(nextIndex, config)
        } else if (config.loop) {
          playCompositeSegment(config.loopFromSegmentIndex ?? 0, config)
        } else {
          element.pause()
        }
      }
    }
    element.addEventListener('timeupdate', compositeTimeUpdateHandler)
  } else {
    compositeEndedHandler = () => {
      if (config.loop) {
        playCompositeSegment(0, config)
        return
      }
      element.pause()
    }
    element.addEventListener('ended', compositeEndedHandler)
  }

  if (element.readyState >= HTMLMediaElement.HAVE_METADATA) {
    beginPlayback()
  } else {
    element.addEventListener('loadedmetadata', beginPlayback, { once: true })
  }
  element.load()
}

function loadCompositeRealLayoutMusicTrack(
  trackId: RealLayoutMusicTrackId,
  config: RealLayoutMusicCompositeConfig,
): void {
  currentTrackId = trackId
  playCompositeSegment(0, config)
}

export async function attemptRealLayoutAutoplay(): Promise<boolean> {
  if (readRealMusicMuted()) {
    audio?.pause()
    return false
  }

  const element = getOrCreateAudio()
  if (!element.src) return false

  element.muted = false
  try {
    await element.play()
    return true
  } catch {
    element.muted = true
    try {
      await element.play()
      return true
    } catch {
      return false
    }
  }
}

function unlockAudibleFromGesture(): void {
  if (readRealMusicMuted()) return
  const element = audio
  if (!element) return
  element.muted = false
  void element.play().catch(() => {})
}

export function installRealLayoutMusicGestureUnlock(): void {
  if (gestureUnlockInstalled) return
  gestureUnlockInstalled = true

  const handler = () => {
    unlockAudibleFromGesture()
    void attemptRealLayoutAutoplay()
  }

  for (const type of ['pointerdown', 'keydown', 'touchstart', 'click'] as const) {
    document.addEventListener(type, handler, { capture: true, passive: true })
  }

  document.getElementById('start-boot-splash')?.addEventListener('pointerdown', handler, {
    capture: true,
    passive: true,
  })
}

export function loadRealLayoutMusicTrack(trackId: RealLayoutMusicTrackId): void {
  const composite = getRealLayoutMusicCompositeConfig(trackId)
  if (composite) {
    if (currentTrackId === trackId && compositeConfig) return
    loadCompositeRealLayoutMusicTrack(trackId, composite)
    return
  }

  clearCompositeHandlers()

  const url = resolveMusicTrackUrl(trackId)
  if (!url) return
  if (currentTrackId === trackId && audio?.src) return

  currentTrackId = trackId
  const element = getOrCreateAudio()
  element.pause()
  element.src = url
  element.loop = true
  element.load()
}

export function pauseRealLayoutMusic(): void {
  audio?.pause()
}

export function bootstrapRealLayoutMusicEarly(trackId = readDefaultRealTrackId()): void {
  const layout = document.querySelector('meta[name="app-layout-mode"]')?.getAttribute('content')?.trim()
  if (layout !== 'real') return

  loadRealLayoutMusicTrack(trackId)
  installRealLayoutMusicGestureUnlock()

  const element = getOrCreateAudio()
  const retry = () => {
    void attemptRealLayoutAutoplay()
  }

  retry()
  element.addEventListener('canplay', retry, { once: true })
  element.addEventListener('canplaythrough', retry, { once: true })
  window.addEventListener('pageshow', retry)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retry()
  })
}

export function getRealLayoutMusicElement(): HTMLAudioElement | null {
  return audio
}

export function getRealLayoutMusicTrackId(): RealLayoutMusicTrackId | null {
  return currentTrackId
}
