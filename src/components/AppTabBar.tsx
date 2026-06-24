import { useEffect, useState, type CSSProperties } from 'react'
import { useCompactTabNav } from '../hooks/useCompactTabNav'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import type { AppTab } from '../types/appTab'
import { APP_TABS, getTabPageHref } from '../utils/appTabNavigation'
import { hasUnreadUpdates } from '../utils/updatesPrompt'
import { AppTabIcon } from './AppTabIcons'

const TAB_KEYS: Record<AppTab, MessageKey> = {
  routes: 'tabRoutes',
  broadcast: 'tabBroadcast',
  music: 'tabMusic',
  complaints: 'tabComplaints',
  updates: 'tabUpdates',
}

interface AppTabBarProps {
  activeTab: AppTab | null
}

export function AppTabBar({ activeTab }: AppTabBarProps) {
  const { t } = useLocale()
  const compact = useCompactTabNav()
  const [updatesUnread, setUpdatesUnread] = useState(() => hasUnreadUpdates())

  const resolvedActive = activeTab ?? 'routes'
  const activeTabIndex = Math.max(0, APP_TABS.indexOf(resolvedActive))
  const showUpdatesBadge = updatesUnread && activeTab !== 'updates'

  useEffect(() => {
    const syncUnread = () => setUpdatesUnread(hasUnreadUpdates())
    syncUnread()
    window.addEventListener('storage', syncUnread)
    window.addEventListener('focus', syncUnread)
    return () => {
      window.removeEventListener('storage', syncUnread)
      window.removeEventListener('focus', syncUnread)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('has-compact-tab-nav', compact)
    return () => document.documentElement.classList.remove('has-compact-tab-nav')
  }, [compact])

  const renderTabLink = (tab: AppTab) => {
    const label = t(TAB_KEYS[tab])
    const isActive = activeTab === tab
    const badge = tab === 'updates' && showUpdatesBadge

    return (
      <a
        key={tab}
        href={getTabPageHref(tab)}
        role="tab"
        aria-selected={isActive}
        data-app-header-tab={tab}
        className={`app-tab-bar-item ${isActive ? 'app-tab-bar-item--active' : ''} ${badge ? 'app-tab-bar-item--has-badge' : ''}`.trim()}
        aria-label={badge ? `${label} (${t('updatesTabBadgeHint')})` : label}
        title={label}
      >
        <span className="app-tab-bar-icon">
          <AppTabIcon tab={tab} active={isActive} />
          {badge ? (
            <span className="app-tab-bar-badge" aria-hidden>
              !
            </span>
          ) : null}
        </span>
        <span className="app-tab-bar-label">{label}</span>
      </a>
    )
  }

  const liquidNav = (
    <nav
      className={`app-tab-bar app-tab-bar--liquid ${compact ? 'app-tab-bar--mobile' : 'app-tab-bar--desktop'}`}
      role="tablist"
      aria-label={t('navMain')}
      style={{ '--active-tab-index': activeTabIndex } as CSSProperties}
    >
      <span className="sibs-liquid-glass-surface app-tab-bar-liquid-surface" aria-hidden />
      <span className="sibs-liquid-glass-indicator app-tab-bar-liquid-indicator" aria-hidden />
      {APP_TABS.map((tab) => renderTabLink(tab))}
    </nav>
  )

  if (compact) {
    return (
      <div className="app-tab-bar-shell app-tab-bar-shell--mobile" data-tour="app-tab-bar">
        {liquidNav}
      </div>
    )
  }

  return (
    <div className="app-tab-bar-shell app-tab-bar-shell--desktop" data-tour="app-tab-bar">
      <div className="app-tab-bar-reveal-zone" aria-hidden />
      {liquidNav}
    </div>
  )
}
