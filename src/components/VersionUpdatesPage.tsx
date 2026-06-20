import { useEffect } from 'react'
import { getLatestUpdatePromptKey, versionUpdates } from '../data/versionUpdates'
import { useLocale } from '../i18n/LocaleContext'
import { markUpdatesLogViewed } from '../storage/updatesViewing'
import { formatBuildLabel, readPublishedBuild } from '../utils/buildLabel'
import { VersionUpdateEntry } from './VersionUpdateEntry'

export function VersionUpdatesPage() {
  const { t, locale } = useLocale()
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__, locale)

  useEffect(() => {
    const latestPromptKey = getLatestUpdatePromptKey()
    if (latestPromptKey) markUpdatesLogViewed(latestPromptKey)
  }, [])

  return (
    <div className="content content--single">
      <p className="page-intro">{t('updatesIntro')}</p>

      <section className="updates-section">
        <div className="updates-section-head">
          <h2 className="section-title">{t('updatesList')}</h2>
          <time className="updates-build-time" dateTime={readPublishedBuild() ?? __APP_BUILD__} title={t('buildTagHint')}>
            {t('buildTag', { time: buildLabel })}
          </time>
        </div>
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
