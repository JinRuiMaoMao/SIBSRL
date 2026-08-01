import { musicTracks } from '../data/musicTracks'
import { resolveSiteAssetUrl } from './appLayoutMode'
import {
  getRealLayoutMusicCompositeConfig,
  type RealLayoutMusicCompositeConfig,
} from './realLayoutMusicComposite'
import {
  cancelAudioFade,
  fadeInAudio,
  fadeLeadSeconds,
  fadeOutAudio,
  REAL_LAYOUT_MUSIC_TARGET_VOLUME,
} from './realLayoutMusicFade'
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
let compositeFadeTransitionPending = false

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
  audio.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
  return audio
}

function clearCompositeHandlers(): void {
  const element = audio
  cancelAudioFade()
  if (!element) return
  if (compositeTimeUpdateHandler) {
    element.removeEventListener('timeupdate', compositeTimeUpdateHandler)
    compositeTimeUpdateHandler = null
  }
  compositeConfig = null
  compositeSegmentIndex = 0
}

async function runCompositeFadeTransition(action: () => void | Promise<void>): Promise<void> {
  const element = audio
  if (!element || compositeFadeTransitionPending) return
  compositeFadeTransitionPending = true
  if (compositeTimeUpdateHandler) {
    element.removeEventListener('timeupdate', compositeTimeUpdateHandler)
    compositeTimeUpdateHandler = null
  }
  await fadeOutAudio(element)
  await action()
  compositeFadeTransitionPending = false
}

function beginCompositeSegmentPlayback(element: HTMLAudioElement, startAt: number, fadeIn: boolean): void {
  try {
    element.currentTime = startAt
  } catch {
    /* metadata may still be loading */
  }
  if (fadeIn) {
    element.volume = 0
  } else {
    element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
  }
  if (!readRealMusicMuted()) {
    const playPromise = element.play()
    if (fadeIn) {
      void playPromise.then(() => fadeInAudio(element)).catch(() => {})
    } else {
      void playPromise.catch(() => {})
    }
  }
}

function attachCompositeSegmentHandlers(
  index: number,
  config: RealLayoutMusicCompositeConfig,
  segment: NonNullable<RealLayoutMusicCompositeConfig['segments'][number]>,
): void {
  const element = getOrCreateAudio()
  const fadeLead = fadeLeadSeconds()
  let fadeStarted = false

  const advanceToSegment = (nextIndex: number, sameSourceLoop = false) => {
    void runCompositeFadeTransition(async () => {
      if (sameSourceLoop) {
        element.pause()
        beginCompositeSegmentPlayback(element, segment.startAt ?? 0, true)
        attachCompositeSegmentHandlers(index, config, segment)
        return
      }
      playCompositeSegment(nextIndex, config, { fadeIn: true })
    })
  }

  compositeTimeUpdateHandler = () => {
    if (compositeFadeTransitionPending || fadeStarted) return

    if (segment.endAt != null) {
      if (element.currentTime < segment.endAt - fadeLead) return
      fadeStarted = true
      const nextIndex = index + 1
      if (nextIndex < config.segments.length) {
        advanceToSegment(nextIndex)
      } else if (config.loop) {
        advanceToSegment(config.loopFromSegmentIndex ?? 0)
      } else {
        void fadeOutAudio(element).then(() => element.pause())
      }
      return
    }

    const duration = element.duration
    if (!Number.isFinite(duration) || duration <= fadeLead) return
    if (element.currentTime < duration - fadeLead) return

    fadeStarted = true
    if (config.loop) {
      advanceToSegment(config.loopFromSegmentIndex ?? index, true)
    } else {
      void fadeOutAudio(element).then(() => element.pause())
    }
  }

  element.addEventListener('timeupdate', compositeTimeUpdateHandler)
}

function playCompositeSegment(
  index: number,
  config: RealLayoutMusicCompositeConfig,
  options: { fadeIn?: boolean } = {},
): void {
  const element = getOrCreateAudio()
  const segment = config.segments[index]
  if (!segment) {
    if (config.loop && config.segments.length > 0) {
      playCompositeSegment(0, config, options)
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
  const fadeIn = options.fadeIn ?? false
  const beginPlayback = () => beginCompositeSegmentPlayback(element, startAt, fadeIn)

  attachCompositeSegmentHandlers(index, config, segment)

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
  compositeFadeTransitionPending = false
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
  element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
  element.load()
}

export function pauseRealLayoutMusic(): void {
  cancelAudioFade()
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
