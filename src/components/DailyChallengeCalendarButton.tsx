import { useLocale } from '../i18n/LocaleContext'

interface DailyChallengeCalendarButtonProps {
  onClick: () => void
}

export function DailyChallengeCalendarButton({ onClick }: DailyChallengeCalendarButtonProps) {
  const { t } = useLocale()

  return (
    <button
      type="button"
      className="daily-challenge-calendar-btn"
      aria-label={t('dailyChallengeCalendarOpen')}
      title={t('dailyChallengeCalendarOpen')}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
    >
      <svg className="daily-challenge-calendar-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          fill="currentColor"
          d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"
        />
      </svg>
    </button>
  )
}
