import { useMemo, useState } from 'react'
import { safetyBroadcasts } from '../data/safetyBroadcasts'
import { useListDensityCompact } from '../hooks/useListDensityCompact'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { MessageKey } from '../i18n/messages'
import type { BroadcastSet } from '../types/safetyBroadcast'
import { BroadcastAudioButton } from './BroadcastAudioButton'
import { SearchBar } from './SearchBar'

const SET_KEYS: Record<BroadcastSet, MessageKey> = {
  common: 'broadcastSetCommon',
  horizon: 'broadcastSetHorizon',
}

const SET_ORDER: BroadcastSet[] = ['common', 'horizon']

function setHasBroadcasts(set: BroadcastSet): boolean {
  return safetyBroadcasts.some((item) => item.set === set)
}

export function BroadcastPage() {
  const { locale, t } = useLocale()
  const compact = useListDensityCompact()
  const [query, setQuery] = useState('')
  const [broadcastSet, setBroadcastSet] = useState<BroadcastSet>('common')
  const [playingId, setPlayingId] = useState<string | null>(null)

  const setItems = useMemo(
    () =>
      safetyBroadcasts
        .filter((item) => item.set === broadcastSet)
        .sort((a, b) => a.number - b.number),
    [broadcastSet],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return setItems
    return setItems.filter((item) => {
      const haystack = [
        item.id,
        item.title.zh,
        item.title.en,
        item.note?.zh,
        item.note?.en,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query, setItems])

  const selectSet = (set: BroadcastSet) => {
    setBroadcastSet(set)
    setPlayingId(null)
    setQuery('')
  }

  return (
    <>
      <p className="page-intro">{t('broadcastIntro')}</p>

      <div className="filter-group broadcast-filters" data-tour="broadcast-filters">
        <span className="filter-label">{t('broadcastSetLabel')}</span>
        <div className="chip-row">
          {SET_ORDER.map((set) => (
            <button
              key={set}
              type="button"
              className={`chip ${broadcastSet === set ? 'active' : ''}`}
              onClick={() => selectSet(set)}
            >
              {t(SET_KEYS[set])}
            </button>
          ))}
        </div>
      </div>

      <SearchBar
        id="safety-broadcast-search"
        dataTour="broadcast-search"
        value={query}
        onChange={setQuery}
        resultCount={filtered.length}
        totalCount={setItems.length}
        labelKey="broadcastSearchLabel"
        placeholderKey="broadcastSearchPlaceholder"
        showShortcutHint={false}
      />

      <section className="safety-broadcast-section" aria-label={t('broadcastList')}>
        {!setHasBroadcasts(broadcastSet) ? (
          <p className="empty-state">{t('broadcastSetEmpty')}</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">{t('broadcastEmptySearch')}</p>
        ) : (
          <ul className="safety-broadcast-list">
            {filtered.map((item, index) => (
              <li key={item.id} className="safety-broadcast-card" data-tour={index === 0 ? 'broadcast-card' : undefined}>
                <div className="safety-broadcast-card-head">
                  <h2 className="safety-broadcast-title">
                    <span className="safety-broadcast-no" aria-hidden="true">
                      {item.number}
                    </span>
                    <span className="safety-broadcast-name">
                      {getPrimaryText(item.title, locale)}
                    </span>
                  </h2>
                  <BroadcastAudioButton
                    id={item.id}
                    src={item.audioUrl}
                    activeId={playingId}
                    onActiveChange={setPlayingId}
                    playLabel={t('broadcastPlay')}
                    pauseLabel={t('broadcastPause')}
                    compact={compact}
                    dataTour={index === 0 ? 'broadcast-play' : undefined}
                  />
                </div>
                {item.note && (
                  <p className="safety-broadcast-note">{getPrimaryText(item.note, locale)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
