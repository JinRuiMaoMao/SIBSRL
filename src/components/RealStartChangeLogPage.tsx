import { useEffect, type AnimationEvent } from 'react'
import { countChangelogEntries } from '../data/changelogStructure'
import { getLatestUpdatePromptKey, versionUpdates } from '../data/versionUpdates'
import { useLocale } from '../i18n/LocaleContext'
import { markUpdatesLogViewed } from '../storage/updatesViewing'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'
import { formatBuildLabel, readPublishedBuild } from '../utils/buildLabel'
import { UpdatesChangelogTotals } from './UpdatesChangelogTotals'
import { VersionUpdateEntry } from './VersionUpdateEntry'
import { RealStartOverlayShell } from './RealStartOverlayShell'

export function RealStartChangeLogPage({
  onClose,
  onAnimationEnd,
}: {
  onClose: () => void
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
}) {
  const { locale, t } = useLocale()
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__, locale)
  const allTotals = countChangelogEntries(versionUpdates)

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
    document.title = t('realStartChangeLogPageDocumentTitle')
  }, [locale, t])

  useEffect(() => {
    const latestPromptKey = getLatestUpdatePromptKey()
    if (latestPromptKey) markUpdatesLogViewed(latestPromptKey)
  }, [])

  return (
    <RealStartOverlayShell title={t('realStartChangeLog')} onClose={onClose} onAnimationEnd={onAnimationEnd}>
      <div className="real-start-changelog-scroll sibs-scrollbar">
        <div className="real-start-changelog-head">
          <p className="real-start-changelog-intro">{t('updatesIntro')}</p>
          <time className="real-start-changelog-build" dateTime={readPublishedBuild() ?? __APP_BUILD__}>
            {t('buildTag', { time: buildLabel })}
          </time>
        </div>
        {versionUpdates.length > 0 ? (
          <UpdatesChangelogTotals counts={allTotals} variant="all" />
        ) : null}
        {versionUpdates.length === 0 ? (
          <p className="real-start-changelog-empty">{t('updatesEmpty')}</p>
        ) : (
          <ol className="real-start-changelog-list">
            {versionUpdates.map((entry) => (
              <li key={entry.id}>
                <VersionUpdateEntry entry={entry} className="real-start-changelog-entry" />
              </li>
            ))}
          </ol>
        )}
      </div>
    </RealStartOverlayShell>
  )
}
