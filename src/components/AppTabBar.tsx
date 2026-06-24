import { useEffect, useRef, useState } from 'react'
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
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const [updatesUnread, setUpdatesUnread] = useState(() => hasUnreadUpdates())
  const shellRef = useRef<HTMLDivElement>(null)

  const resolvedActive = activeTab ?? 'routes'
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
    const onTourReveal = () => {
      if (compact) setMobileExpanded(true)
    }
    window.addEventListener('sibs-reveal-tab-bar', onTourReveal)
    return () => window.removeEventListener('sibs-reveal-tab-bar', onTourReveal)
  }, [compact])

  useEffect(() => {
    if (!compact || !mobileExpanded) return

    const onPointerDown = (event: PointerEvent) => {
      if (shellRef.current && !shellRef.current.contains(event.target as Node)) {
        setMobileExpanded(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileExpanded(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [compact, mobileExpanded])

  useEffect(() => {
    document.documentElement.classList.toggle('has-compact-tab-nav', compact)
    return () => document.documentElement.classList.remove('has-compact-tab-nav')
  }, [compact])

  const renderTabLink = (tab: AppTab, showLabel: boolean) => {
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
        onClick={() => setMobileExpanded(false)}
      >
        <span className="app-tab-bar-icon">
          <AppTabIcon tab={tab} />
          {badge ? (
            <span className="app-tab-bar-badge" aria-hidden>
              !
            </span>
          ) : null}
        </span>
        {showLabel ? <span className="app-tab-bar-label">{label}</span> : null}
      </a>
    )
  }

  if (compact) {
    return (
      <div
        ref={shellRef}
        className={`app-tab-bar-shell app-tab-bar-shell--mobile ${mobileExpanded ? 'is-expanded' : ''}`}
        data-tour="app-tab-bar"
      >
        {mobileExpanded ? (
          <button
            type="button"
            className="app-tab-bar-backdrop"
            aria-label={t('appTabBarCollapse')}
            onClick={() => setMobileExpanded(false)}
          />
        ) : null}

        {mobileExpanded ? (
          <nav className="app-tab-bar app-tab-bar--mobile-expanded" role="tablist" aria-label={t('navMain')}>
            {APP_TABS.map((tab) => renderTabLink(tab, true))}
          </nav>
        ) : (
          <button
            type="button"
            className={`app-tab-bar-fab ${showUpdatesBadge ? 'app-tab-bar-fab--has-badge' : ''}`.trim()}
            aria-expanded={false}
            aria-controls="app-tab-bar-menu"
            aria-label={t('appTabBarExpand')}
            onClick={() => setMobileExpanded(true)}
          >
            <span className="app-tab-bar-icon">
              <AppTabIcon tab={resolvedActive} />
              {showUpdatesBadge ? (
                <span className="app-tab-bar-badge" aria-hidden>
                  !
                </span>
              ) : null}
            </span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="app-tab-bar-shell app-tab-bar-shell--desktop" data-tour="app-tab-bar">
      <div className="app-tab-bar-reveal-zone" aria-hidden />
      <nav className="app-tab-bar app-tab-bar--desktop" role="tablist" aria-label={t('navMain')}>
        {APP_TABS.map((tab) => renderTabLink(tab, true))}
      </nav>
    </div>
  )
}
