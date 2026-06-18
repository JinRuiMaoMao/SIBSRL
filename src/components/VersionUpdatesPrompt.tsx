import { useEffect } from 'react'
import { versionUpdates } from '../data/versionUpdates'
import { useLocale } from '../i18n/LocaleContext'
import { markUpdatesLogViewed } from '../storage/updatesViewing'
import { getTabPageHref } from '../utils/appTabNavigation'
import { VersionUpdateEntry } from './VersionUpdateEntry'

interface VersionUpdatesPromptProps {
  open: boolean
  onClose: () => void
}

export function VersionUpdatesPrompt({ open, onClose }: VersionUpdatesPromptProps) {
  const { t } = useLocale()
  const latestEntry = versionUpdates[0] ?? null

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !latestEntry) return null

  const handleViewAll = () => {
    markUpdatesLogViewed()
    onClose()
    window.location.href = getTabPageHref('updates')
  }

  return (
    <div className="daily-challenge-prompt-root">
      <button
        type="button"
        className="daily-challenge-prompt-backdrop"
        aria-label={t('updatesPromptDismiss')}
        onClick={onClose}
      />
      <div
        className="daily-challenge-prompt-panel updates-prompt-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="updates-prompt-title"
      >
        <h2 id="updates-prompt-title" className="daily-challenge-prompt-title">
          {t('updatesPromptTitle')}
        </h2>
        <div className="updates-prompt-body sibs-scrollbar">
          <VersionUpdateEntry entry={latestEntry} className="updates-card updates-card--prompt" />
        </div>
        <button type="button" className="updates-prompt-view-all" onClick={handleViewAll}>
          {t('updatesPromptViewAll')}
        </button>
        <button type="button" className="daily-challenge-prompt-dismiss" onClick={onClose}>
          {t('updatesPromptDismiss')}
        </button>
      </div>
    </div>
  )
}
