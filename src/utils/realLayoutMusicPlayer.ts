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
    __SIBS_REAL_LAYOUT_AUDIO_EXTRA__?: HTMLAudioElement
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

let audioPrimary: HTMLAudioElement | null = null
let audioSecondary: HTMLAudioElement | null = null
let activeAudio: HTMLAudioElement | null = null
let currentTrackId: RealLayoutMusicTrackId | null = null
let gestureUnlockInstalled = false
let compositeConfig: RealLayoutMusicCompositeConfig | null = null
let compositeSegmentIndex = 0
let compositeTimeUpdateHandler: (() => void) | null = null
let compositeEndedHandler: (() => void) | null = null

interface PendingCrossfade {
  outgoing: HTMLAudioElement
  incoming: HTMLAudioElement
  nextIndex: number
  config: RealLayoutMusicCompositeConfig
  segment: RealLayoutMusicCompositeSegment
}

let pendingCrossfade: PendingCrossfade | null = null

function createAudioElement(): HTMLAudioElement {
  const element = new Audio()
  element.preload = 'auto'
  element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
  return element
}

function ensureAudioPair(): [HTMLAudioElement, HTMLAudioElement] {
  if (!audioPrimary) audioPrimary = createAudioElement()
  if (!audioSecondary) audioSecondary = createAudioElement()
  return [audioPrimary, audioSecondary]
}

function getActiveAudio(): HTMLAudioElement {
  if (activeAudio) return activeAudio
  if (window.__SIBS_REAL_LAYOUT_AUDIO__ instanceof HTMLAudioElement) {
    const adopted = adoptEarlyAudio()
    if (adopted) return adopted
  }
  const [primary] = ensureAudioPair()
  activeAudio = primary
  return activeAudio
}

function getInactiveAudio(): HTMLAudioElement {
  const [primary, secondary] = ensureAudioPair()
  return getActiveAudio() === primary ? secondary : primary
}

function adoptEarlyAudio(): HTMLAudioElement | null {
  const early = window.__SIBS_REAL_LAYOUT_AUDIO__
  if (!(early instanceof HTMLAudioElement)) return null

  window.__SIBS_REAL_LAYOUT_MUSIC_ADOPTED__ = true
  delete window.__SIBS_REAL_LAYOUT_AUDIO__

  const extra = window.__SIBS_REAL_LAYOUT_AUDIO_EXTRA__
  delete window.__SIBS_REAL_LAYOUT_AUDIO_EXTRA__

  for (const element of [early, extra]) {
    if (!(element instanceof HTMLAudioElement)) continue
    element.pause()
    try {
      element.removeAttribute('src')
      element.load()
    } catch {
      /* ignore */
    }
  }

  const [primary, secondary] = ensureAudioPair()
  primary.muted = early.muted
  secondary.muted = early.muted
  activeAudio = primary
  return primary
}

function getOrCreateAudio(): HTMLAudioElement {
  return getActiveAudio()
}

function pauseAllAudio(): void {
  cancelAudioFade()
  audioPrimary?.pause()
  audioSecondary?.pause()
}

function clearCompositeHandlers(): void {
  cancelAudioFade()
  pendingCrossfade = null

  for (const element of [audioPrimary, audioSecondary]) {
    if (!element) continue
    if (compositeTimeUpdateHandler) {
      element.removeEventListener('timeupdate', compositeTimeUpdateHandler)
    }
    if (compositeEndedHandler) {
      element.removeEventListener('ended', compositeEndedHandler)
    }
  }

  compositeTimeUpdateHandler = null
  compositeEndedHandler = null
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

function rampVolumeForSplice(
  element: HTMLAudioElement,
  currentTime: number,
  fadeAt: number,
  fadeLead: number,
): void {
  const fadeEnd = fadeAt + fadeLead
  if (currentTime <= fadeAt) {
    element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
    return
  }
  if (currentTime >= fadeEnd) {
    element.volume = 0
    return
  }
  const progress = (currentTime - fadeAt) / fadeLead
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

function sameResolvedAudioSrc(element: HTMLAudioElement, url: string): boolean {
  if (!element.src && !url) return true
  try {
    return new URL(element.src, window.location.href).href === new URL(url, window.location.href).href
  } catch {
    return element.src === url
  }
}

function preloadIncomingSegment(
  incoming: HTMLAudioElement,
  segment: RealLayoutMusicCompositeSegment,
): void {
  const url = resolveCompositeAssetUrl(segment.asset)
  if (!sameResolvedAudioSrc(incoming, url)) {
    incoming.src = url
    incoming.load()
  }
}

function whenIncomingCanPlay(incoming: HTMLAudioElement): Promise<void> {
  if (incoming.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    incoming.addEventListener('canplay', () => resolve(), { once: true })
  })
}

function beginIncomingCrossfade(
  nextIndex: number,
  config: RealLayoutMusicCompositeConfig,
  outgoing: HTMLAudioElement,
): void {
  const segment = config.segments[nextIndex]
  if (!segment || pendingCrossfade) return

  const incoming = getInactiveAudio()
  if (incoming === outgoing) return

  incoming.loop = false
  incoming.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
  incoming.muted = outgoing.muted

  const startAt = segment.startAt ?? 0
  preloadIncomingSegment(incoming, segment)

  pendingCrossfade = { outgoing, incoming, nextIndex, config, segment }

  void whenIncomingCanPlay(incoming).then(() => {
    if (!pendingCrossfade || pendingCrossfade.incoming !== incoming) return
    try {
      incoming.currentTime = startAt
    } catch {
      /* metadata may still be loading */
    }
    if (readRealMusicMuted()) return
    void incoming.play().catch(() => {})
  })
}

function finalizeCrossfade(): void {
  if (!pendingCrossfade) return

  const { outgoing, incoming, nextIndex, config, segment } = pendingCrossfade
  pendingCrossfade = null

  const startAt = segment.startAt ?? 0
  if (incoming.paused) {
    try {
      incoming.currentTime = startAt
    } catch {
      /* metadata may still be loading */
    }
    incoming.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
    if (!readRealMusicMuted()) void incoming.play().catch(() => {})
  }

  outgoing.pause()
  try {
    outgoing.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
  } catch {
    /* ignore */
  }

  if (compositeTimeUpdateHandler) {
    outgoing.removeEventListener('timeupdate', compositeTimeUpdateHandler)
  }
  if (compositeEndedHandler) {
    outgoing.removeEventListener('ended', compositeEndedHandler)
  }
  compositeTimeUpdateHandler = null
  compositeEndedHandler = null

  activeAudio = incoming
  compositeConfig = config
  compositeSegmentIndex = nextIndex
  attachCompositeSegmentHandlers(nextIndex, config, segment)
}

function attachCompositeSegmentHandlers(
  index: number,
  config: RealLayoutMusicCompositeConfig,
  segment: RealLayoutMusicCompositeSegment,
): void {
  const element = getActiveAudio()
  const nextIndex = resolveNextSegmentIndex(index, config)

  if (config.instantSegmentHandoff && segment.endAt == null) {
    let handedOff = false

    const handoffOnce = () => {
      if (handedOff || nextIndex == null) return
      handedOff = true
      playCompositeSegment(nextIndex, config)
    }

    compositeEndedHandler = handoffOnce
    element.addEventListener('ended', compositeEndedHandler)

    compositeTimeUpdateHandler = () => {
      const duration = element.duration
      if (!Number.isFinite(duration) || duration <= 0) return
      if (element.currentTime >= duration - 0.05) handoffOnce()
    }
    element.addEventListener('timeupdate', compositeTimeUpdateHandler)
    return
  }

  const fadeLead = fadeLeadSeconds()
  let crossfadeStarted = false
  let finalized = false

  if (nextIndex != null) {
    const nextSegment = config.segments[nextIndex]
    if (nextSegment) {
      const inactive = getInactiveAudio()
      preloadIncomingSegment(inactive, nextSegment)
      void whenIncomingCanPlay(inactive).catch(() => {})
    }
  }

  const finalizeOnce = () => {
    if (finalized) return
    finalized = true
    finalizeCrossfade()
  }

  if (segment.endAt != null) {
    const fadeAt = segment.endAt
    const fadeEnd = fadeAt + fadeLead

    compositeTimeUpdateHandler = () => {
      if (finalized) return
      const t = element.currentTime

      if (nextIndex != null && t >= fadeAt && !crossfadeStarted) {
        crossfadeStarted = true
        beginIncomingCrossfade(nextIndex, config, element)
      }

      if (t >= fadeAt) {
        rampVolumeForSplice(element, t, fadeAt, fadeLead)
      }

      if (t >= fadeEnd && nextIndex != null) {
        finalizeOnce()
      }
    }

    if (nextIndex != null) {
      compositeEndedHandler = () => {
        if (!finalized && !crossfadeStarted) {
          beginIncomingCrossfade(nextIndex, config, element)
        }
        if (!finalized) finalizeOnce()
      }
      element.addEventListener('ended', compositeEndedHandler)
    }

    element.addEventListener('timeupdate', compositeTimeUpdateHandler)
    return
  }

  compositeTimeUpdateHandler = () => {
    if (finalized) return
    const duration = element.duration
    if (!Number.isFinite(duration)) return
    const fadeAt = duration
    const fadeEnd = fadeAt + fadeLead

    if (nextIndex != null && element.currentTime >= fadeAt && !crossfadeStarted) {
      crossfadeStarted = true
      beginIncomingCrossfade(nextIndex, config, element)
    }

    if (element.currentTime >= fadeAt) {
      rampVolumeForSplice(element, element.currentTime, fadeAt, fadeLead)
    }

    if (element.currentTime >= fadeEnd && nextIndex != null) {
      finalizeOnce()
    }
  }
  element.addEventListener('timeupdate', compositeTimeUpdateHandler)
}

function playCompositeSegment(
  index: number,
  config: RealLayoutMusicCompositeConfig,
  options: { fadeIn?: boolean } = {},
): void {
  const element = getActiveAudio()
  const segment = config.segments[index]
  if (!segment) {
    if (config.loop && config.segments.length > 0) {
      playCompositeSegment(0, config, options)
    }
    return
  }

  clearCompositeHandlers()
  compositeConfig = config
  compositeSegmentIndex = index

  element.loop = false
  element.src = resolveCompositeAssetUrl(segment.asset)
  element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME

  attachCompositeSegmentHandlers(index, config, segment)
  element.load()

  const nextIndex = resolveNextSegmentIndex(index, config)
  if (nextIndex != null) {
    const nextSegment = config.segments[nextIndex]
    if (nextSegment) {
      const inactive = getInactiveAudio()
      preloadIncomingSegment(inactive, nextSegment)
      void whenIncomingCanPlay(inactive).catch(() => {})
    }
  }

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
    pauseAllAudio()
    return false
  }

  const element = getOrCreateAudio()
  if (!element.src) return false

  element.muted = false
  getInactiveAudio().muted = false

  const playing =
    (audioPrimary && !audioPrimary.paused) || (audioSecondary && !audioSecondary.paused)
  if (playing) return true

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
  if (currentTrackId === trackId && getActiveAudio().src) return

  currentTrackId = trackId
  const element = getActiveAudio()
  pauseAllAudio()
  element.pause()
  element.src = url
  element.loop = true
  element.volume = REAL_LAYOUT_MUSIC_TARGET_VOLUME
  element.load()
}

export function pauseRealLayoutMusic(): void {
  pauseAllAudio()
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
  return activeAudio ?? audioPrimary
}

export function getRealLayoutMusicTrackId(): RealLayoutMusicTrackId | null {
  return currentTrackId
}
