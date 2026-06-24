import { useState } from 'react'
import { NPC_CATEGORIES, npcAudioItems, type NpcAudioFilter } from '../data/npcAudio'
import { useListDensityCompact } from '../hooks/useListDensityCompact'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import { BroadcastAudioButton } from './BroadcastAudioButton'

export function ComplaintsPage() {
  const { locale, t } = useLocale()
  const compact = useListDensityCompact()
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<NpcAudioFilter>('all')

  const filteredItems =
    filter === 'all' ? [...npcAudioItems] : npcAudioItems.filter((item) => item.category === filter)

  return (
    <div className="content content--single">
      <p className="page-intro">{t('complaintsIntro')}</p>

      <div className="filter-group broadcast-filters" data-tour="complaints-filters">
        <span className="filter-label">{t('complaintsFilterLabel')}</span>
        <div className="chip-row">
          <button type="button" className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            {t('complaintsFilterAll')}
          </button>
          {NPC_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`chip ${filter === category ? 'active' : ''}`}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <section className="complaints-section" aria-label={t('complaintsList')}>
        <h2 className="section-title">{t('complaintsList')}</h2>
        {filteredItems.length === 0 ? (
          <p className="empty-state">{filter === 'all' ? t('complaintsEmpty') : t('npcCategoryEmpty')}</p>
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
