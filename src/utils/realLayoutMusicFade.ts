export const REAL_LAYOUT_MUSIC_FADE_MS = 900

export const REAL_LAYOUT_MUSIC_TARGET_VOLUME = 1

let fadeFrame: number | null = null

export function cancelAudioFade(): void {
  if (fadeFrame != null) {
    cancelAnimationFrame(fadeFrame)
    fadeFrame = null
  }
}

export function fadeAudioVolume(
  element: HTMLAudioElement,
  targetVolume: number,
  durationMs = REAL_LAYOUT_MUSIC_FADE_MS,
): Promise<void> {
  cancelAudioFade()
  const startVolume = element.volume
  const start = performance.now()

  return new Promise((resolve) => {
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      element.volume = startVolume + (targetVolume - startVolume) * progress
      if (progress < 1) {
        fadeFrame = requestAnimationFrame(step)
      } else {
        fadeFrame = null
        element.volume = targetVolume
        resolve()
      }
    }
    fadeFrame = requestAnimationFrame(step)
  })
}

export function fadeOutAudio(
  element: HTMLAudioElement,
  durationMs = REAL_LAYOUT_MUSIC_FADE_MS,
): Promise<void> {
  return fadeAudioVolume(element, 0, durationMs)
}

export function fadeInAudio(
  element: HTMLAudioElement,
  durationMs = REAL_LAYOUT_MUSIC_FADE_MS,
): Promise<void> {
  element.volume = 0
  return fadeAudioVolume(element, REAL_LAYOUT_MUSIC_TARGET_VOLUME, durationMs)
}

export function fadeLeadSeconds(durationMs = REAL_LAYOUT_MUSIC_FADE_MS): number {
  return durationMs / 1000
}
