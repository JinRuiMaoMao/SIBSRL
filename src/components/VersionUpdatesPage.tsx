import { useEffect } from 'react'
import { getLatestUpdateId, versionUpdates } from '../data/versionUpdates'
import { useLocale } from '../i18n/LocaleContext'
import { markUpdatesLogViewed } from '../storage/updatesViewing'
import { VersionUpdateEntry } from './VersionUpdateEntry'

export function VersionUpdatesPage() {
  const { t } = useLocale()

  useEffect(() => {
    const latestId = getLatestUpdateId()
    if (latestId) markUpdatesLogViewed(latestId)
  }, [])

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
              <li key={entry.id}>
                <VersionUpdateEntry entry={entry} className="updates-card" />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
