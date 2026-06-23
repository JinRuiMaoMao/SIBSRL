import { useState } from 'react'
import { passengerComplaints } from '../data/passengerComplaints'
import { useListDensityCompact } from '../hooks/useListDensityCompact'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { ComplaintFilter } from '../types/passengerComplaint'
import { BroadcastAudioButton } from './BroadcastAudioButton'

export function ComplaintsPage() {
  const { locale, t } = useLocale()
  const compact = useListDensityCompact()
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<ComplaintFilter>('all')

  const allItems = [...passengerComplaints].sort((a, b) => a.number - b.number)
  const filteredItems = filter === 'all' ? allItems : allItems.filter((item) => item.category === filter)

  return (
    <div className="content content--single">
      <p className="page-intro">{t('complaintsIntro')}</p>

      <div className="filter-group broadcast-filters" data-tour="complaints-filters">
        <span className="filter-label">{t('complaintsFilterLabel')}</span>
        <div className="chip-row">
          <button type="button" className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            {t('complaintsFilterAll')}
          </button>
          <button type="button" className={`chip ${filter === 'driving' ? 'active' : ''}`} onClick={() => setFilter('driving')}>
            {t('complaintsFilterDriving')}
          </button>
          <button type="button" className={`chip ${filter === 'alight' ? 'active' : ''}`} onClick={() => setFilter('alight')}>
            {t('complaintsFilterAlight')}
          </button>
          <button type="button" className={`chip ${filter === 'service' ? 'active' : ''}`} onClick={() => setFilter('service')}>
            {t('complaintsFilterService')}
          </button>
        </div>
      </div>

      <section className="complaints-section" aria-label={t('complaintsList')}>
        <h2 className="section-title">{t('complaintsList')}</h2>
        {filter === 'service' ? (
          <p className="empty-state">{t('complaintsServiceNoAudio')}</p>
        ) : filteredItems.length === 0 ? (
          <p className="empty-state">{t('complaintsEmpty')}</p>
        ) : (
          <ul className="complaints-list">
            {filteredItems.map((item, index) => (
              <li key={item.id} className="complaints-card" data-tour={index === 0 ? 'complaints-card' : undefined}>
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
                    compact={compact}
                    dataTour={index === 0 ? 'complaints-play' : undefined}
                  />
                </div>
                <p className="complaints-detail">{getPrimaryText(item.detail, locale)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
