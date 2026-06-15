import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useLocale } from '../i18n/LocaleContext'

const SPEED_PRESETS = [1, 2, 5, 10] as const
const MIN_PLAYBACK_RATE = 0.25
const MAX_PLAYBACK_RATE = 100
const SPEED_CLAMP_NOTICE_MS = 1250
const LOOP_REWIND_MS = 450

function loopRewindDurationMs(): number {
  if (typeof window === 'undefined') return LOOP_REWIND_MS
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : LOOP_REWIND_MS
}

interface BroadcastAudioButtonProps {
  id: string
  src: string
  activeId: string | null
  onActiveChange: (id: string | null) => void
  playLabel: string
  pauseLabel: string
  /** 分站名旁紧凑喇叭 */
  compact?: boolean
  /** 播放结束后自动循环 */
  loop?: boolean
}

function clampPlaybackRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1
  return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, rate))
}

function trySetAudioPlaybackRate(audio: HTMLAudioElement, rate: number): boolean {
  try {
    audio.playbackRate = rate
    return Math.abs(audio.playbackRate - rate) < 0.001
  } catch {
    return false
  }
}

function wasPlaybackRateClamped(requested: number, applied: number): boolean {
  return Math.abs(applied - requested) > 0.001
}

/** 将倍速应用到 audio，超出浏览器支持范围时自动降到可用最大值 */
function applyAudioPlaybackRate(
  audio: HTMLAudioElement,
  requested: number,
): { requested: number; applied: number; clampedByBrowser: boolean } {
  const target = clampPlaybackRate(requested)
  if (trySetAudioPlaybackRate(audio, target)) {
    return { requested: target, applied: target, clampedByBrowser: false }
  }

  let low = MIN_PLAYBACK_RATE
  let high = target
  let best = 1

  for (let i = 0; i < 24; i++) {
    const mid = Math.round(((low + high) / 2) * 100) / 100
    if (trySetAudioPlaybackRate(audio, mid)) {
      best = mid
      low = mid
    } else {
      high = mid
    }
    if (high - low < 0.01) break
  }

  trySetAudioPlaybackRate(audio, best)
  return {
    requested: target,
    applied: best,
    clampedByBrowser: wasPlaybackRateClamped(target, best),
  }
}

function formatPlaybackRate(rate: number): string {
  const rounded = Math.round(rate * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return String(rounded)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

export function BroadcastAudioButton({
  id,
  src,
  activeId,
  onActiveChange,
  playLabel,
  pauseLabel,
  compact = false,
  loop = false,
}: BroadcastAudioButtonProps) {
  const { t } = useLocale()
  const speedMenuId = useId()
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const speedMenuRef = useRef<HTMLDivElement>(null)
  const seekingRef = useRef(false)
  const prevTimeRef = useRef(0)
  const loopRewindRef = useRef(false)
  const loopRewindTimerRef = useRef<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isLoopRewinding, setIsLoopRewinding] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)
  const [customSpeedInput, setCustomSpeedInput] = useState('')
  const [speedClampNotice, setSpeedClampNotice] = useState<{
    requested: string
    applied: string
  } | null>(null)

  const engaged = activeId === id
  const isPlaying = engaged && !paused

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || engaged) return

    audio.pause()
    audio.currentTime = 0
    audio.playbackRate = 1
    setPaused(false)
    setProgress(0)
    setIsLoopRewinding(false)
    loopRewindRef.current = false
    prevTimeRef.current = 0
    if (loopRewindTimerRef.current != null) {
      window.clearTimeout(loopRewindTimerRef.current)
      loopRewindTimerRef.current = null
    }
    setPlaybackRate(1)
    setSpeedMenuOpen(false)
    setCustomSpeedInput('')
    setSpeedClampNotice(null)
  }, [engaged])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !engaged) return

    const result = applyAudioPlaybackRate(audio, playbackRate)
    if (result.applied !== playbackRate) {
      setPlaybackRate(result.applied)
      setCustomSpeedInput(formatPlaybackRate(result.applied))
    }
    if (result.clampedByBrowser) {
      setSpeedClampNotice({
        requested: formatPlaybackRate(result.requested),
        applied: formatPlaybackRate(result.applied),
      })
      setSpeedMenuOpen(true)
    }

    const finishLoopRewind = () => {
      loopRewindRef.current = false
      setIsLoopRewinding(false)
      if (loopRewindTimerRef.current != null) {
        window.clearTimeout(loopRewindTimerRef.current)
        loopRewindTimerRef.current = null
      }
    }

    const startLoopRewind = () => {
      if (loopRewindRef.current) return
      const rewindMs = loopRewindDurationMs()
      loopRewindRef.current = true
      setIsLoopRewinding(rewindMs > 0)
      setProgress(1)

      if (rewindMs === 0) {
        setProgress(0)
        finishLoopRewind()
        return
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setProgress(0))
      })
      loopRewindTimerRef.current = window.setTimeout(finishLoopRewind, rewindMs + 40)
    }

    const onTimeUpdate = () => {
      if (seekingRef.current || loopRewindRef.current) return
      if (!audio.duration || !Number.isFinite(audio.duration)) {
        setProgress(0)
        return
      }

      const current = audio.currentTime
      const duration = audio.duration
      const previous = prevTimeRef.current

      if (loop && previous > duration * 0.75 && current < duration * 0.25) {
        prevTimeRef.current = current
        startLoopRewind()
        return
      }

      setProgress(current / duration)
      prevTimeRef.current = current
    }

    const onEnded = () => {
      if (loop) return
      onActiveChange(null)
      setPaused(false)
      setProgress(0)
      setPlaybackRate(1)
      setSpeedMenuOpen(false)
      setCustomSpeedInput('')
      setSpeedClampNotice(null)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      if (loopRewindTimerRef.current != null) {
        window.clearTimeout(loopRewindTimerRef.current)
        loopRewindTimerRef.current = null
      }
    }
  }, [engaged, playbackRate, loop, onActiveChange])

  useEffect(() => {
    if (!speedClampNotice) return
    const timer = window.setTimeout(() => setSpeedClampNotice(null), SPEED_CLAMP_NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [speedClampNotice])

  useEffect(() => {
    if (!speedMenuOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (speedMenuRef.current?.contains(target)) return
      setSpeedMenuOpen(false)
      setSpeedClampNotice(null)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [speedMenuOpen])

  const applyPlaybackRate = (rate: number): boolean => {
    const audio = audioRef.current
    const requested = clampPlaybackRate(rate)
    if (!audio) {
      setPlaybackRate(requested)
      setCustomSpeedInput(formatPlaybackRate(requested))
      setSpeedClampNotice(null)
      return false
    }

    const result = applyAudioPlaybackRate(audio, requested)
    setPlaybackRate(result.applied)
    setCustomSpeedInput(formatPlaybackRate(result.applied))

    if (result.clampedByBrowser) {
      setSpeedClampNotice({
        requested: formatPlaybackRate(result.requested),
        applied: formatPlaybackRate(result.applied),
      })
      setSpeedMenuOpen(true)
      return true
    }

    setSpeedClampNotice(null)
    return false
  }

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (!engaged) {
      onActiveChange(id)
      setPaused(false)
      void audio.play().catch(() => {
        onActiveChange(null)
        setPaused(false)
      })
      return
    }

    if (paused) {
      setPaused(false)
      void audio.play().catch(() => {
        onActiveChange(null)
        setPaused(false)
      })
      return
    }

    audio.pause()
    setPaused(true)
  }

  const toggleSpeedMenu = () => {
    setSpeedMenuOpen((open) => {
      const next = !open
      if (next) {
        setCustomSpeedInput(formatPlaybackRate(playbackRate))
      } else {
        setSpeedClampNotice(null)
      }
      return next
    })
  }

  const handleCustomSpeedSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = Number.parseFloat(customSpeedInput.trim())
    if (!Number.isFinite(parsed)) return
    const clamped = applyPlaybackRate(parsed)
    if (!clamped) {
      setSpeedMenuOpen(false)
      return
    }
    setSpeedMenuOpen(true)
  }

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return
    const clamped = Math.min(1, Math.max(0, ratio))
    audio.currentTime = clamped * audio.duration
    setProgress(clamped)
  }

  const ratioFromClientX = (clientX: number) => {
    const el = progressRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return 0
    return (clientX - rect.left) / rect.width
  }

  const handleProgressPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    seekingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    seekToRatio(ratioFromClientX(event.clientX))
  }

  const handleProgressPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!seekingRef.current) return
    seekToRatio(ratioFromClientX(event.clientX))
  }

  const endProgressSeek = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!seekingRef.current) return
    seekingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    seekToRatio(ratioFromClientX(event.clientX))
  }

  const progressPercent = Math.round(progress * 100)
  const rateLabel = `${formatPlaybackRate(playbackRate)}×`

  return (
    <div
      className={`broadcast-audio-player ${compact ? 'broadcast-audio-player--compact' : ''} ${
        engaged ? 'broadcast-audio-player--engaged' : ''
      }`}
    >
      <audio ref={audioRef} src={src} preload="none" loop={loop} className="broadcast-audio-hidden" />
      <button
        type="button"
        className={`broadcast-play-btn ${compact ? 'broadcast-play-btn--compact' : ''} ${
          isPlaying ? 'playing' : ''
        }`}
        onClick={togglePlayPause}
        aria-label={isPlaying ? pauseLabel : playLabel}
        aria-pressed={isPlaying}
      >
        <svg className="broadcast-play-icon" viewBox="0 0 24 24" aria-hidden>
          {isPlaying ? (
            <path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
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

      {engaged ? (
        <div className="broadcast-audio-toolbar">
          <div
            ref={progressRef}
            className="broadcast-audio-progress"
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label={t('broadcastSeek')}
            onPointerDown={handleProgressPointerDown}
            onPointerMove={handleProgressPointerMove}
            onPointerUp={endProgressSeek}
            onPointerCancel={endProgressSeek}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 0.1 : 0.02
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                seekToRatio(progress + step)
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault()
                seekToRatio(progress - step)
              }
            }}
          >
            <div className="broadcast-audio-progress-track" aria-hidden>
              <div
                className={`broadcast-audio-progress-fill ${isLoopRewinding ? 'is-loop-rewinding' : ''}`}
                style={{ width: `${progressPercent}%` }}
                onTransitionEnd={(event) => {
                  if (event.propertyName !== 'width' || !isLoopRewinding) return
                  loopRewindRef.current = false
                  setIsLoopRewinding(false)
                  if (loopRewindTimerRef.current != null) {
                    window.clearTimeout(loopRewindTimerRef.current)
                    loopRewindTimerRef.current = null
                  }
                }}
              />
            </div>
          </div>

          <div className="broadcast-audio-speed" ref={speedMenuRef}>
            <button
              type="button"
              className={`broadcast-audio-speed-btn ${speedMenuOpen ? 'open' : ''} ${
                playbackRate !== 1 ? 'active' : ''
              }`}
              aria-expanded={speedMenuOpen}
              aria-controls={speedMenuId}
              aria-label={t('broadcastSpeedMenu')}
              onClick={toggleSpeedMenu}
            >
              {rateLabel}
            </button>

            {speedMenuOpen ? (
              <div id={speedMenuId} className="broadcast-audio-speed-panel" role="dialog" aria-label={t('broadcastSpeedMenu')}>
                <div className="broadcast-audio-speed-presets" role="group" aria-label={t('broadcastSpeedMenu')}>
                  {SPEED_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`broadcast-audio-speed-preset ${
                        playbackRate === preset ? 'active' : ''
                      }`}
                      onClick={() => {
                        const clamped = applyPlaybackRate(preset)
                        if (!clamped) setSpeedMenuOpen(false)
                      }}
                    >
                      {preset}×
                    </button>
                  ))}
                </div>
                <form className="broadcast-audio-speed-custom" onSubmit={handleCustomSpeedSubmit} noValidate>
                  <label className="sr-only" htmlFor={`${speedMenuId}-input`}>
                    {t('broadcastSpeedCustom')}
                  </label>
                  <input
                    id={`${speedMenuId}-input`}
                    type="number"
                    className="broadcast-audio-speed-input"
                    min={MIN_PLAYBACK_RATE}
                    max={MAX_PLAYBACK_RATE}
                    step="any"
                    inputMode="decimal"
                    placeholder={t('broadcastSpeedCustom')}
                    value={customSpeedInput}
                    onChange={(event) => {
                      setCustomSpeedInput(event.target.value)
                      setSpeedClampNotice(null)
                    }}
                  />
                  <button type="submit" className="broadcast-audio-speed-apply">
                    {t('broadcastSpeedApply')}
                  </button>
                </form>
                {speedClampNotice ? (
                  <p className="broadcast-audio-speed-notice" role="status">
                    {t('broadcastSpeedBrowserClamped', {
                      requested: speedClampNotice.requested,
                      applied: speedClampNotice.applied,
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
