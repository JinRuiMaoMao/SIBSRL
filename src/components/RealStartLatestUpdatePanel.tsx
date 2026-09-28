import { useMemo, type MouseEvent } from 'react'
import { versionUpdates } from '../data/versionUpdates'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { Locale } from '../i18n/types'
import { getTabPageHref } from '../utils/appTabNavigation'
import { navigateRealShellTab } from '../utils/realShellNavigation'

function formatUpdateDate(date: string, locale: Locale): string {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  const stamp = Date.UTC(year, month - 1, day, 12, 0, 0)
  return new Intl.DateTimeFormat(locale === 'zh-Hans' || locale === 'zh-Hant' ? locale : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(stamp)
}

function formatUpdateVersion(date: string): string {
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return 'V?'
  return `V${year.slice(2)}.${month}.${day}`
}

export function RealStartLatestUpdatePanel() {
  const { locale, t } = useLocale()
  const latest = versionUpdates[0]
  const versionLabel = useMemo(
    () => (latest ? formatUpdateVersion(latest.date) : 'V—'),
    [latest],
  )
  const dateLabel = useMemo(
    () => (latest ? formatUpdateDate(latest.date, locale) : '—'),
    [latest, locale],
  )
  const titleLabel = latest ? getPrimaryText(latest.title, locale) : t('realStartLatestUpdateEmpty')

  const openUpdates = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    event.preventDefault()
    navigateRealShellTab('updates')
  }

  return (
    <div className="real-start-changelog">
      <p className="real-start-changelog-title">{t('realStartLatestUpdate')}</p>
      <button type="button" className="real-start-changelog-thumb" onClick={openUpdates}>
        <span className="real-start-changelog-thumb-ver">{versionLabel}</span>
        <span className="real-start-changelog-thumb-date">{dateLabel}</span>
        <span className="real-start-changelog-thumb-caption">{titleLabel}</span>
      </button>
      <a className="real-start-changelog-enter" href={getTabPageHref('updates')} onClick={openUpdates}>
        {t('realStartViewChangeLog')}
      </a>
    </div>
  )
}
