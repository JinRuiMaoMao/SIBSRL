import { useCallback, useEffect, useRef, useState } from 'react'
import { musicTracks } from '../data/musicTracks'
import { resolveSiteAssetUrl } from '../utils/appLayoutMode'
import {
  readRealMusicMuted,
  writeRealMusicMuted,
  type RealLayoutMusicTrackId,
} from '../utils/realLayoutMusicStorage'

function resolveMusicTrackUrl(trackId: RealLayoutMusicTrackId): string | null {
  const track = musicTracks.find((entry) => entry.id === trackId)
  if (!track) return null
  return resolveSiteAssetUrl(track.audioUrl.replace(/^\.\//, ''))
}

export function useRealLayoutBackgroundMusic(trackId: RealLayoutMusicTrackId) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(readRealMusicMuted)

  const syncPlayback = useCallback((audio: HTMLAudioElement, nextMuted: boolean) => {
    if (nextMuted) {
      audio.pause()
      return
    }
    void audio.play().catch(() => {})
  }, [])

  const setMutedState = useCallback(
    (nextMuted: boolean) => {
      setMuted(nextMuted)
      writeRealMusicMuted(nextMuted)
      const audio = audioRef.current
      if (audio) syncPlayback(audio, nextMuted)
    },
    [syncPlayback],
  )

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current
      writeRealMusicMuted(next)
      const audio = audioRef.current
      if (audio) syncPlayback(audio, next)
      return next
    })
  }, [syncPlayback])

  const switchTrack = useCallback(
    (nextTrackId: RealLayoutMusicTrackId) => {
      const audio = audioRef.current
      const nextUrl = resolveMusicTrackUrl(nextTrackId)
      if (!audio || !nextUrl) return

      audio.pause()
      audio.src = nextUrl
      audio.loop = true
      audio.currentTime = 0
      syncPlayback(audio, readRealMusicMuted())
    },
    [syncPlayback],
  )

  useEffect(() => {
    const url = resolveMusicTrackUrl(trackId)
    if (!url) return

    const audio = new Audio(url)
    audio.loop = true
    audio.preload = 'auto'
    audioRef.current = audio
    syncPlayback(audio, readRealMusicMuted())

    return () => {
      audio.pause()
      audio.src = ''
      if (audioRef.current === audio) {
        audioRef.current = null
      }
    }
  }, [syncPlayback, trackId])

  return {
    muted,
    toggleMuted,
    switchTrack,
    setMuted: setMutedState,
    retryPlay: useCallback(() => {
      const audio = audioRef.current
      if (audio && !readRealMusicMuted()) {
        void audio.play().catch(() => {})
      }
    }, []),
  }
}
