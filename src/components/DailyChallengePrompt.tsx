import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { lockPageScroll } from '../utils/pageScrollLock'
import type { DailyChallengeInfo } from '../data/dailyChallenge'
import { useLocale } from '../i18n/LocaleContext'
import { DailyChallengeCard } from './DailyChallengeCard'

interface DailyChallengePromptProps {
  open: boolean
  onClose: () => void
  onOpenDetail: () => void
  challenge: DailyChallengeInfo
}

export function DailyChallengePrompt({
  open,
  onClose,
  onOpenDetail,
  challenge,
}: DailyChallengePromptProps) {
  const { t } = useLocale()

  useEffect(() => {
    if (!open) return
    return lockPageScroll()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleOpenDetail = () => {
    onClose()
    onOpenDetail()
  }

  return createPortal(
    <div className="daily-challenge-prompt-root">
      <button
        type="button"
        className="daily-challenge-prompt-backdrop"
        aria-label={t('dailyChallengePromptDismiss')}
        onClick={onClose}
      />
      <div
        className="daily-challenge-prompt-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-challenge-prompt-title"
      >
        <h2 id="daily-challenge-prompt-title" className="daily-challenge-prompt-title">
          {t('dailyChallengePromptTitle')}
        </h2>
        <DailyChallengeCard
          className="daily-challenge-card--prompt"
          showPlaceholderNote={false}
          onSelect={handleOpenDetail}
          challenge={challenge}
        />
        <button type="button" className="daily-challenge-prompt-dismiss" onClick={onClose}>
          {t('dailyChallengePromptDismiss')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
