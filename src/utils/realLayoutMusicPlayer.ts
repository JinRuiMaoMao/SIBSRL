import { musicTracks } from '../data/musicTracks'
import { resolveSiteAssetUrl } from './appLayoutMode'
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

function readDefaultRealTrackId(): RealLayoutMusicTrackId {
  const page = document.querySelector('meta[name="app-page"]')?.getAttribute('content')?.trim()
  return page === 'start' ? 'music-main-menu' : 'music-map-menu'
}

let audio: HTMLAudioElement | null = null
let currentTrackId: RealLayoutMusicTrackId | null = null
let gestureUnlockInstalled = false

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
