import { versionUpdates } from '../data/versionUpdates'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'

export function VersionUpdatesPage() {
  const { t, locale } = useLocale()

  return (
    <div className="content content--single">
      <p className="page-intro">{t('updatesIntro')}</p>

      <section className="updates-section">
        <h2 className="section-title">{t('updatesList')}</h2>
        {versionUpdates.length === 0 ? (
          <p className="empty">{t('updatesEmpty')}</p>
        ) : (
          <ol className="updates-list">
            {versionUpdates.map((entry) => (
              <li key={entry.id} className="updates-card">
                <div className="updates-head">
                  <h3 className="updates-title">{getPrimaryText(entry.title, locale)}</h3>
                  <time className="updates-date">{entry.date}</time>
                </div>
                <ul className="updates-items">
                  {entry.items.map((item, idx) => (
                    <li key={`${entry.id}-${idx}`}>{getPrimaryText(item, locale)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
