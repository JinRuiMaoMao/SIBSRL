import { useEffect, useRef } from 'react'

interface BroadcastAudioButtonProps {
  id: string
  src: string
  activeId: string | null
  onActiveChange: (id: string | null) => void
  playLabel: string
  pauseLabel: string
}

export function BroadcastAudioButton({
  id,
  src,
  activeId,
  onActiveChange,
  playLabel,
  pauseLabel,
}: BroadcastAudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const playing = activeId === id

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || playing) return
    audio.pause()
    audio.currentTime = 0
  }, [playing])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      onActiveChange(null)
      return
    }
    onActiveChange(id)
    void audio.play().catch(() => onActiveChange(null))
  }

  return (
    <>
      <audio ref={audioRef} src={src} preload="none" className="broadcast-audio-hidden" />
      <button
        type="button"
        className={`broadcast-play-btn ${playing ? 'playing' : ''}`}
        onClick={toggle}
        aria-label={playing ? pauseLabel : playLabel}
        aria-pressed={playing}
      >
        <svg className="broadcast-play-icon" viewBox="0 0 24 24" aria-hidden>
          {playing ? (
            <path
              fill="currentColor"
              d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"
            />
          ) : (
            <>
              <path
                fill="currentColor"
                d="M3 10v4c0 1.1.9 2 2 2h3l4 4V4L8 8H5c-1.1 0-2 .9-2 2z"
              />
              <path
                fill="currentColor"
                d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
              />
            </>
          )}
        </svg>
      </button>
    </>
  )
}
