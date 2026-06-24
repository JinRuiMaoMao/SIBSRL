import type { ChangelogItemCounts } from '../data/changelogStructure'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'

interface UpdatesChangelogTotalsProps {
  counts: ChangelogItemCounts
  variant: 'entry' | 'all'
  className?: string
}

const MESSAGE_KEYS: Record<UpdatesChangelogTotalsProps['variant'], MessageKey> = {
  entry: 'updatesChangelogTotalsDay',
  all: 'updatesChangelogTotalsAll',
}

export function UpdatesChangelogTotals({
  counts,
  variant,
  className = '',
}: UpdatesChangelogTotalsProps) {
  const { t } = useLocale()

  if (counts.additions === 0 && counts.fixes === 0) return null

  return (
    <p
      className={`updates-changelog-totals updates-changelog-totals--${variant} ${className}`.trim()}
    >
      {t(MESSAGE_KEYS[variant], {
        additions: counts.additions,
        fixes: counts.fixes,
      })}
    </p>
  )
}
