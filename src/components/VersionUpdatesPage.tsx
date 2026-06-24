import { useEffect } from 'react'
import { getLatestUpdateId, versionUpdates } from '../data/versionUpdates'
import { useLocale } from '../i18n/LocaleContext'
import { markUpdatesLogViewed } from '../storage/updatesViewing'
import { formatBuildLabel, readPublishedBuild } from '../utils/buildLabel'
import { VersionUpdateEntry } from './VersionUpdateEntry'

export function VersionUpdatesPage() {
  const { t, locale } = useLocale()
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__, locale)

  useEffect(() => {
    const latestUpdateId = getLatestUpdateId()
    if (latestUpdateId) markUpdatesLogViewed(latestUpdateId)
  }, [])

  return (
    <div className="content content--single">
      <p className="page-intro">{t('updatesIntro')}</p>

      <section className="updates-section">
        <div className="updates-section-head" data-tour="updates-head">
          <h2 className="section-title">{t('updatesList')}</h2>
          <time className="updates-build-time" dateTime={readPublishedBuild() ?? __APP_BUILD__} title={t('buildTagHint')}>
            {t('buildTag', { time: buildLabel })}
          </time>
        </div>
        {versionUpdates.length === 0 ? (
          <p className="empty">{t('updatesEmpty')}</p>
        ) : (
          <ol className="updates-list">
            {versionUpdates.map((entry, index) => (
              <li key={entry.id}>
                <VersionUpdateEntry entry={entry} className="updates-card" dataTour={index === 0 ? 'updates-entry' : undefined} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
