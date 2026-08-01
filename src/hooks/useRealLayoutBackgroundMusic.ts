import { useCallback, useEffect, useState } from 'react'
import {
  attemptRealLayoutAutoplay,
  bootstrapRealLayoutMusicEarly,
  getRealLayoutMusicElement,
  loadRealLayoutMusicTrack,
  pauseRealLayoutMusic,
} from '../utils/realLayoutMusicPlayer'
import {
  readRealMusicMuted,
  writeRealMusicMuted,
  type RealLayoutMusicTrackId,
} from '../utils/realLayoutMusicStorage'

export function useRealLayoutBackgroundMusic(trackId: RealLayoutMusicTrackId) {
  const [muted, setMuted] = useState(readRealMusicMuted)

  useEffect(() => {
    bootstrapRealLayoutMusicEarly(trackId)
    loadRealLayoutMusicTrack(trackId)
    void attemptRealLayoutAutoplay()
  }, [trackId])

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
      element.currentTime = 0
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
