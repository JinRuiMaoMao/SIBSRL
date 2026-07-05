import { useState, type ReactNode } from 'react'
import { musicTracks, type MusicTrack } from '../data/musicTracks'
import { musicTracksLegacy178 } from '../data/musicTracksLegacy178'
import { useListDensityCompact } from '../hooks/useListDensityCompact'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import { BroadcastAudioButton } from './BroadcastAudioButton'

interface MusicTrackListProps {
  tracks: readonly MusicTrack[]
  playingId: string | null
  onPlayingChange: (id: string | null) => void
  compact: boolean
  emptyLabel: string
  firstCardTour?: string
  firstPlayTour?: string
}

function MusicTrackList({
  tracks,
  playingId,
  onPlayingChange,
  compact,
  emptyLabel,
  firstCardTour,
  firstPlayTour,
}: MusicTrackListProps) {
  const { locale, t } = useLocale()

  if (tracks.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>
  }

  return (
    <ul className="complaints-list">
      {tracks.map((item, index) => (
        <li key={item.id} className="complaints-card" data-tour={index === 0 ? firstCardTour : undefined}>
          <div className="complaints-head">
            <h3 className="complaints-title">
              <span className="complaints-no" aria-hidden="true">
                {item.number}
              </span>
              <span>{getPrimaryText(item.title, locale)}</span>
            </h3>
            <BroadcastAudioButton
              id={item.id}
              src={item.audioUrl}
              activeId={playingId}
              onActiveChange={onPlayingChange}
              playLabel={t('broadcastPlay')}
              pauseLabel={t('broadcastPause')}
              loop={item.loop}
              compact={compact}
              dataTour={index === 0 ? firstPlayTour : undefined}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

interface MusicSectionProps {
  title: string
  intro?: string
  ariaLabel: string
  className?: string
  dataTour?: string
  children: ReactNode
}

function MusicSection({ title, intro, ariaLabel, className, dataTour, children }: MusicSectionProps) {
  return (
    <section
      className={`complaints-section${className ? ` ${className}` : ''}`.trim()}
      aria-label={ariaLabel}
      data-tour={dataTour}
    >
      <h2 className="section-title">{title}</h2>
      {intro ? <p className="page-intro music-section-intro">{intro}</p> : null}
      {children}
    </section>
  )
}

export function MusicPage() {
  const { t } = useLocale()
  const compact = useListDensityCompact()
  const [playingId, setPlayingId] = useState<string | null>(null)
  const tracks = [...musicTracks].sort((a, b) => a.number - b.number)
  const legacyTracks = [...musicTracksLegacy178].sort((a, b) => a.number - b.number)

  return (
    <div className="content content--single">
      <p className="page-intro">{t('musicIntro')}</p>

      <MusicSection title={t('musicList')} ariaLabel={t('musicList')} dataTour="music-list">
        <MusicTrackList
          tracks={tracks}
          playingId={playingId}
          onPlayingChange={setPlayingId}
          compact={compact}
          emptyLabel={t('musicEmpty')}
          firstCardTour="music-card"
          firstPlayTour="music-play"
        />
      </MusicSection>

      <MusicSection
        title={t('musicLegacy178Section')}
        intro={t('musicLegacy178Intro')}
        ariaLabel={t('musicLegacy178Section')}
        className="music-legacy-section"
      >
        <MusicTrackList
          tracks={legacyTracks}
          playingId={playingId}
          onPlayingChange={setPlayingId}
          compact={compact}
          emptyLabel={t('musicLegacy178Empty')}
        />
      </MusicSection>
    </div>
  )
}
