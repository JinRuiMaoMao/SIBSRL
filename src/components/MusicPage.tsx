import { useState } from 'react'
import { musicTracks } from '../data/musicTracks'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import { BroadcastAudioButton } from './BroadcastAudioButton'

export function MusicPage() {
  const { locale, t } = useLocale()
  const [playingId, setPlayingId] = useState<string | null>(null)
  const tracks = [...musicTracks].sort((a, b) => a.number - b.number)

  return (
    <div className="content content--single">
      <p className="page-intro">{t('musicIntro')}</p>

      <section className="complaints-section" aria-label={t('musicList')}>
        <h2 className="section-title">{t('musicList')}</h2>
        {tracks.length === 0 ? (
          <p className="empty-state">{t('musicEmpty')}</p>
        ) : (
          <ul className="complaints-list">
            {tracks.map((item) => (
              <li key={item.id} className="complaints-card">
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
                    onActiveChange={setPlayingId}
                    playLabel={t('broadcastPlay')}
                    pauseLabel={t('broadcastPause')}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
