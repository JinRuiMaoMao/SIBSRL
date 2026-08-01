import { musicTracks } from '../data/musicTracks'
import { resolveSiteAssetUrl } from './appLayoutMode'
import {
  getRealLayoutMusicCompositeConfig,
  type RealLayoutMusicCompositeConfig,
  type RealLayoutMusicCompositeSegment,
} from './realLayoutMusicComposite'
import {
  cancelAudioFade,
  fadeInAudio,
  fadeLeadSeconds,
  REAL_LAYOUT_MUSIC_TARGET_VOLUME,
} from './realLayoutMusicFade'
import { readRealMusicMuted, type RealLayoutMusicTrackId } from './realLayoutMusicStorage'

declare global {
  interface Window {
    __SIBS_REAL_LAYOUT_AUDIO__?: HTMLAudioElement
    /** Set when React player takes over; inline bootstrap must stop touching early audio. */
    __SIBS_REAL_LAYOUT_MUSIC_ADOPTED__?: boolean
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

  window.__SIBS_REAL_LAYOUT_MUSIC_ADOPTED__ = true
  delete window.__SIBS_REAL_LAYOUT_AUDIO__

  early.pause()
  try {
    early.removeAttribute('src')
    early.load()
  } catch {
    /* ignore */
  }

  audio = new Audio()
  audio.preload = 'auto'
  audio.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
  audio.muted = early.muted
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
  if (compositeEndedHandler) {
    element.removeEventListener('ended', compositeEndedHandler)
    compositeEndedHandler = null
  }
  compositeConfig = null
  compositeSegmentIndex = 0
}

function resolveNextSegmentIndex(
  index: number,
  config: RealLayoutMusicCompositeConfig,
): number | null {
  const nextIndex = index + 1
  if (nextIndex < config.segments.length) return nextIndex
  if (config.loop) return config.loopFromSegmentIndex ?? 0
  return null
}

function rampVolumeForSplice(element: HTMLAudioElement, currentTime: number, cutAt: number, fadeLead: number): void {
  const fadeStart = cutAt - fadeLead
  if (currentTime <= fadeStart) {
    element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
    return
  }
  if (currentTime >= cutAt) {
    element.volume = 0
    return
  }
  const progress = (currentTime - fadeStart) / fadeLead
  element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME * (1 - progress)
}

function startSegmentPlayback(element: HTMLAudioElement, startAt: number, fadeIn: boolean): void {
  const play = () => {
    try {
      element.currentTime = startAt
    } catch {
      /* metadata may still be loading */
    }
    element.volume = fadeIn ? 0 : REAL_LAYOUT_MUSIC_TARGET_VOLUME
    if (readRealMusicMuted()) return
    void element
      .play()
      .then(() => {
        if (fadeIn) void fadeInAudio(element)
      })
      .catch(() => {
        element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
      })
  }

  if (element.readyState >= HTMLMediaElement.HAVE_METADATA) {
    play()
  } else {
    element.addEventListener('loadedmetadata', play, { once: true })
  }
}

function spliceToSegment(
  nextIndex: number,
  config: RealLayoutMusicCompositeConfig,
  options: { fadeIn?: boolean } = {},
): void {
  const element = getOrCreateAudio()
  const nextSegment = config.segments[nextIndex]
  if (!nextSegment) return

  const fadeIn = options.fadeIn ?? false
  const startAt = nextSegment.startAt ?? 0
  const nextUrl = resolveCompositeAssetUrl(nextSegment.asset)
  const sameSource = element.src === nextUrl

  compositeSegmentIndex = nextIndex
  clearCompositeHandlers()
  compositeConfig = config
  compositeSegmentIndex = nextIndex

  element.loop = false
  cancelAudioFade()
  element.volume = fadeIn ? 0 : REAL_LAYOUT_MUSIC_TARGET_VOLUME

  const afterReady = () => {
    startSegmentPlayback(element, startAt, fadeIn)
    attachCompositeSegmentHandlers(nextIndex, config, nextSegment)
  }

  if (sameSource) {
    afterReady()
    return
  }

  element.src = nextUrl
  element.addEventListener('loadedmetadata', afterReady, { once: true })
  element.load()
}

function attachCompositeSegmentHandlers(
  index: number,
  config: RealLayoutMusicCompositeConfig,
  segment: RealLayoutMusicCompositeSegment,
): void {
  const element = getOrCreateAudio()
  const fadeLead = fadeLeadSeconds()
  let spliced = false

  const performSplice = (nextIndex: number) => {
    if (spliced) return
    spliced = true
    spliceToSegment(nextIndex, config, { fadeIn: false })
  }

  if (segment.endAt != null) {
    const cutAt = segment.endAt
    const nextIndex = resolveNextSegmentIndex(index, config)

    compositeTimeUpdateHandler = () => {
      if (spliced) return
      const t = element.currentTime
      rampVolumeForSplice(element, t, cutAt, fadeLead)
      if (t >= cutAt && nextIndex != null) {
        performSplice(nextIndex)
      }
    }

    if (nextIndex != null) {
      compositeEndedHandler = () => {
        if (!spliced) performSplice(nextIndex)
      }
      element.addEventListener('ended', compositeEndedHandler)
    }

    element.addEventListener('timeupdate', compositeTimeUpdateHandler)
    return
  }

  compositeTimeUpdateHandler = () => {
    if (spliced) return
    const duration = element.duration
    if (!Number.isFinite(duration)) return
    const cutAt = duration
    rampVolumeForSplice(element, element.currentTime, cutAt, fadeLead)
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
  element.src = resolveCompositeAssetUrl(segment.asset)
  element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME

  attachCompositeSegmentHandlers(index, config, segment)
  element.load()
  startSegmentPlayback(element, segment.startAt ?? 0, options.fadeIn ?? false)
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
  if (!element.paused) return true

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

export function installRealLayoutMusicGestureUnlock(): void {
  if (gestureUnlockInstalled) return
  gestureUnlockInstalled = true

  const handler = () => {
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
