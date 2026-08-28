import { useCallback, useEffect, useState } from 'react'
import {
  attemptRealLayoutAutoplay,
  bootstrapRealLayoutMusicEarly,
  getRealLayoutMusicElement,
  loadRealLayoutMusicTrack,
  pauseRealLayoutMusic,
} from '../utils/realLayoutMusicPlayer'
import { getRealLayoutMusicCompositeConfig } from '../utils/realLayoutMusicComposite'
import {
  readRealMusicMuted,
  writeRealMusicMuted,
  type RealLayoutMusicTrackId,
} from '../utils/realLayoutMusicStorage'

export function useRealLayoutBackgroundMusic(
  trackId: RealLayoutMusicTrackId,
  options?: { loadTrack?: boolean },
) {
  const [muted, setMuted] = useState(readRealMusicMuted)
  const loadTrack = options?.loadTrack !== false

  useEffect(() => {
    if (!loadTrack) return
    bootstrapRealLayoutMusicEarly(trackId)
    loadRealLayoutMusicTrack(trackId)
    void attemptRealLayoutAutoplay()
  }, [trackId, loadTrack])

  const setMutedState = useCallback((nextMuted: boolean) => {
    setMuted(nextMuted)
    writeRealMusicMuted(nextMuted)
    if (nextMuted) {
      pauseRealLayoutMusic()
      return
    }
    const element = getRealLayoutMusicElement()
    if (element) element.muted = false
    void attemptRealLayoutAutoplay()
  }, [])

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current
      writeRealMusicMuted(next)
      if (next) {
        pauseRealLayoutMusic()
      } else {
        const element = getRealLayoutMusicElement()
        if (element) element.muted = false
        void attemptRealLayoutAutoplay()
      }
      return next
    })
  }, [])

  const switchTrack = useCallback((nextTrackId: RealLayoutMusicTrackId) => {
    loadRealLayoutMusicTrack(nextTrackId)
    if (readRealMusicMuted()) {
      pauseRealLayoutMusic()
      return
    }
    const element = getRealLayoutMusicElement()
    if (element) {
      if (!getRealLayoutMusicCompositeConfig(nextTrackId)) {
        element.currentTime = 0
      }
      element.muted = false
    }
    void attemptRealLayoutAutoplay()
  }, [])

  const retryPlay = useCallback(() => {
    if (!readRealMusicMuted()) void attemptRealLayoutAutoplay()
  }, [])

  return {
    muted,
    toggleMuted,
    switchTrack,
    setMuted: setMutedState,
    retryPlay,
  }
}
