import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { REAL_START_MENU_LAYOUT } from '../data/realStartMenuLayout'
import { useRealStartMenuScale } from '../hooks/useRealStartMenuScale'
import { getTodaysDailyChallenge, type DailyChallengeInfo } from '../data/dailyChallenge'
import { getStartPageExternalLinkUrl } from '../data/startPageLinks'
import { getSiteLogoUrl } from '../data/siteBrand'
import { useRealLayoutBackgroundMusic } from '../hooks/useRealLayoutBackgroundMusic'
import { useStartPageBoot } from '../hooks/useStartPageBoot'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import type { Locale } from '../i18n/types'
import { getTabPageHref } from '../utils/appTabNavigation'
import { navigateRealShellTab } from '../utils/realShellNavigation'
import { preserveAppHistoryState } from '../utils/appHistoryState'
import { formatBuildLabel, readPublishedBuild } from '../utils/buildLabel'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'
import { dispatchRealHudAction } from '../utils/realHudEvents'
import { RealLanguagePage } from './RealLanguagePage'
import { RealStartBackground } from './RealStartBackground'
import { isAppReduceMotionEnabled } from '../storage/appPreferences'
import { REAL_SHELL_TRANSITION_MS } from '../utils/realShellTransition'

const REAL_LANGUAGE_TRANSITION_MS = REAL_SHELL_TRANSITION_MS

type OverlayViewPhase = 'closed' | 'opening' | 'open' | 'closing'

interface RealStartMenuItem {
  id: string
  labelKey: 'realStartPlay' | 'realStartServers' | 'realStartProfile' | 'language'
  icon: string
  tone: 'green' | 'blue' | 'purple'
  href?: string
  external?: boolean
  onClick?: () => void
  linkOnClick?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

interface RealStartDockItem {
  id: string
  href?: string
  labelKey:
    | 'tabMusic'
    | 'realStartFaq'
    | 'realStartAbout'
    | 'realStartShop'
    | 'realStartChangeLog'
    | 'realStartCredit'
  icon: string
  external?: boolean
  onClick?: () => void
  toggleSubmenu?: boolean
  ariaPressed?: boolean
}

function formatChallengeScheduleDate(date: string, locale: Locale): string {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date

  const stamp = Date.UTC(year, month - 1, day, 4, 0, 0)
  const formatter = new Intl.DateTimeFormat(
    locale === 'zh-Hans' || locale === 'zh-Hant' ? locale : locale.startsWith('zh') ? 'zh-Hant' : locale,
    {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
  )

  return formatter.format(stamp)
}

function buildChallengeDetail(challenge: DailyChallengeInfo, locale: Locale): string {
  const eventLabel = getPrimaryText(challenge.event, locale)
  if (challenge.routeNumber) return `${eventLabel} ${challenge.routeNumber}`
  return eventLabel
}

function RealStartDailyChallengeCard({
  challenge,
  onOpenRoutes,
}: {
  challenge: DailyChallengeInfo
  onOpenRoutes: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const { locale, t } = useLocale()
  const detail = challenge.isAvailable
    ? buildChallengeDetail(challenge, locale)
    : t('realStartDailyChallengeUnavailable')
  const routeNumber = challenge.routeNumber ?? '?'

  return (
    <a
      className="real-start-challenge"
      href={getTabPageHref('routes')}
      onClick={onOpenRoutes}
      aria-label={t('realStartDailyChallengeLabel', { detail })}
    >
      <div className="real-start-challenge-grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="real-start-challenge-thumb">
            {index === 1 || index === 2 ? '?' : routeNumber}
          </span>
        ))}
      </div>
      <p className="real-start-challenge-copy">{t('realStartDailyChallengeLabel', { detail })}</p>
      <p className="real-start-challenge-date">
        <span aria-hidden="true">📅</span>
        {formatChallengeScheduleDate(challenge.date, locale)}
      </p>
    </a>
  )
}

export function RealStartPage({ sharedBackground = false }: { sharedBackground?: boolean }) {
  const bootReady = useStartPageBoot()
  const { locale, t } = useLocale()
  const { muted, toggleMuted, retryPlay } = useRealLayoutBackgroundMusic('music-main-menu', {
    loadTrack: !sharedBackground,
  })
  const [languagePhase, setLanguagePhase] = useState<OverlayViewPhase>('closed')
  const [aboutSubmenuOpen, setAboutSubmenuOpen] = useState(false)
  const menuRootRef = useRef<HTMLDivElement>(null)
  const { uiScale } = useRealStartMenuScale(menuRootRef)
  const layoutVars = useMemo(
    () =>
      ({
        '--real-start-ui-scale': String(uiScale),
        '--real-start-menu-height': `${REAL_START_MENU_LAYOUT.menuHeightScale * 100}%`,
        '--real-start-top-height': `${REAL_START_MENU_LAYOUT.topHeightScale * 100}%`,
        '--real-start-main-height': `${REAL_START_MENU_LAYOUT.mainHeightScale * 100}%`,
        '--real-start-left-width': `${REAL_START_MENU_LAYOUT.leftColumnWidthScale * 100}%`,
        '--real-start-right-width': `${REAL_START_MENU_LAYOUT.rightColumnWidthScale * 100}%`,
        '--real-start-button-width': `${REAL_START_MENU_LAYOUT.buttonWidthScale * 100}%`,
        '--real-start-button-height': `${REAL_START_MENU_LAYOUT.buttonHeightScale * 100}%`,
        '--real-start-version-height': `${REAL_START_MENU_LAYOUT.versionHeightScale * 100}%`,
        '--real-start-rb-inset': `${REAL_START_MENU_LAYOUT.menuRbInsetPx}px`,
        '--real-start-about-offset-x': `${REAL_START_MENU_LAYOUT.aboutButtonsOffsetPx.x}px`,
        '--real-start-about-offset-y': `${REAL_START_MENU_LAYOUT.aboutButtonsOffsetPx.y}px`,
      }) as CSSProperties,
    [uiScale],
  )
  const languageMounted = languagePhase !== 'closed'
  const overlayActive = languagePhase !== 'closed'
  const challenge = useMemo(() => getTodaysDailyChallenge(), [])
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__, locale)
  const robloxHref = getStartPageExternalLinkUrl('roblox', locale)
  const wikiHref = getStartPageExternalLinkUrl('wiki', locale)

  const openRoutes = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    navigateRealShellTab('routes')
  }

  const openLanguage = useCallback(() => {
    if (isAppReduceMotionEnabled()) {
      setLanguagePhase('open')
      return
    }
    setLanguagePhase('opening')
  }, [])

  const closeLanguage = useCallback(() => {
    if (languagePhase === 'closed' || languagePhase === 'closing') return
    if (isAppReduceMotionEnabled()) {
      setLanguagePhase('closed')
      return
    }
    setLanguagePhase('closing')
  }, [languagePhase])

  const handleLanguageAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return
      const name = event.animationName
      if (languagePhase === 'opening' && name.includes('real-shell-slide-up-from-bottom')) {
        setLanguagePhase('open')
      } else if (languagePhase === 'closing' && name.includes('real-shell-slide-down-out')) {
        setLanguagePhase('closed')
      }
    },
    [languagePhase],
  )

  useEffect(() => {
    if (languagePhase !== 'opening' && languagePhase !== 'closing') return
    const timer = window.setTimeout(() => {
      setLanguagePhase((phase) => {
        if (phase === 'opening') return 'open'
        if (phase === 'closing') return 'closed'
        return phase
      })
    }, REAL_LANGUAGE_TRANSITION_MS + 80)
    return () => window.clearTimeout(timer)
  }, [languagePhase])

  const mainMenu: RealStartMenuItem[] = [
    {
      id: 'play',
      href: getTabPageHref('routes'),
      labelKey: 'realStartPlay',
      icon: '▶',
      tone: 'green',
      linkOnClick: openRoutes,
    },
    { id: 'servers', href: robloxHref, labelKey: 'realStartServers', icon: '⛁', tone: 'green', external: true },
    {
      id: 'profile',
      labelKey: 'realStartProfile',
      icon: '👤',
      tone: 'blue',
      onClick: () => dispatchRealHudAction({ type: 'open-profile', tab: 'stats' }),
    },
    {
      id: 'language',
      labelKey: 'language',
      icon: '文',
      tone: 'purple',
      onClick: openLanguage,
    },
  ]

  const toggleAboutSubmenu = useCallback(() => {
    setAboutSubmenuOpen((open) => !open)
  }, [])

  const mainDockItems: RealStartDockItem[] = [
    { id: 'music', labelKey: 'tabMusic', icon: muted ? '🔇' : '♪', onClick: toggleMuted },
    { id: 'faq', href: wikiHref, labelKey: 'realStartFaq', icon: '?', external: true },
    {
      id: 'about',
      labelKey: 'realStartAbout',
      icon: 'i',
      onClick: toggleAboutSubmenu,
      toggleSubmenu: true,
      ariaPressed: aboutSubmenuOpen,
    },
    { id: 'shop', labelKey: 'realStartShop', icon: '🛒', onClick: () => dispatchRealHudAction({ type: 'open-shop' }) },
  ]

  const aboutSubmenuItems: RealStartDockItem[] = [
    {
      id: 'changelog',
      labelKey: 'realStartChangeLog',
      icon: '📋',
      onClick: () => navigateRealShellTab('updates'),
    },
    {
      id: 'credit',
      href: wikiHref,
      labelKey: 'realStartCredit',
      icon: '★',
      external: true,
    },
  ]

  useEffect(() => {
    if (overlayActive) return
    syncFavicon()
    syncHtmlLang(locale)
    document.title = t('realStartPageDocumentTitle')
  }, [overlayActive, locale, t])

  useEffect(() => {
    const legacyLanguageHash = window.location.hash.replace(/^#/, '').trim().toLowerCase()
    if (legacyLanguageHash !== 'language') return
    const cleanUrl = `${window.location.pathname}${window.location.search}`
    window.history.replaceState(preserveAppHistoryState(), '', cleanUrl)
    openLanguage()
  }, [openLanguage])

  useEffect(() => {
    if (!bootReady || muted || overlayActive) return
    retryPlay()
  }, [bootReady, overlayActive, muted, retryPlay])

  return (
    <div
      className={`real-start-stack${sharedBackground ? ' real-start-stack--shared-background' : ''}${!sharedBackground && bootReady ? ' real-start-stack--ready' : ''}`}
      data-language-phase={languagePhase}
    >
      {sharedBackground ? null : <RealStartBackground />}

      <div className="real-start-page sibs-scrollbar">
        <div
          className={`real-start-panel${bootReady ? ' real-start-page--ready' : ' real-start-page--booting'}`}
        >
      <div className="real-start-stage" style={layoutVars}>
        <div ref={menuRootRef} className="real-start-menu-root">
          <header className="real-start-brand">
            <img className="real-start-logo" src={getSiteLogoUrl()} alt="" width={88} height={88} decoding="async" />
            <h1 className="real-start-title">
              <span>{t('realStartTitleLine1')}</span>
              <span>{t('realStartTitleLine2')}</span>
            </h1>
          </header>

          <div className="real-start-body">
            <nav className="real-start-menu" aria-label={t('realStartPlay')}>
              <ul className="real-start-menu-list">
                {mainMenu.map((item) => (
                  <li key={item.id}>
                    {item.onClick && !item.href ? (
                      <button
                        type="button"
                        className={`real-start-menu-btn real-start-menu-btn--${item.tone}`}
                        onClick={item.onClick}
                      >
                        <span className="real-start-menu-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className="real-start-menu-label">{t(item.labelKey)}</span>
                      </button>
                    ) : (
                      <a
                        className={`real-start-menu-btn real-start-menu-btn--${item.tone}`}
                        href={item.href}
                        onClick={
                          item.linkOnClick && item.href
                            ? (event) => item.linkOnClick!(event, item.href!)
                            : undefined
                        }
                        {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      >
                        <span className="real-start-menu-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className="real-start-menu-label">{t(item.labelKey)}</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <aside className="real-start-featured" aria-label={t('dailyChallengeToday')}>
              <RealStartDailyChallengeCard challenge={challenge} onOpenRoutes={openRoutes} />
            </aside>
          </div>

          <p className="real-start-version">{t('realStartVersionLabel', { version: buildLabel })}</p>
        </div>

        <div className="real-start-menu-rb">
        <nav className="real-start-dock" aria-label={t('startPageCommunityLinks')}>
          <ul className="real-start-dock-list">
            {mainDockItems.map((item) => (
              <li key={item.id}>
                {item.onClick ? (
                  <button
                    type="button"
                    className={`real-start-dock-btn${item.id === 'music' && muted ? ' real-start-dock-btn--muted' : ''}${item.toggleSubmenu && item.ariaPressed ? ' real-start-dock-btn--active' : ''}`}
                    onClick={item.onClick}
                    aria-pressed={
                      item.id === 'music' ? muted : item.toggleSubmenu ? item.ariaPressed : undefined
                    }
                    aria-label={item.id === 'music' ? t(muted ? 'realStartMusicUnmute' : 'realStartMusicMute') : t(item.labelKey)}
                    aria-expanded={item.toggleSubmenu ? item.ariaPressed : undefined}
                  >
                    <span className="real-start-dock-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="real-start-dock-label">{t(item.labelKey)}</span>
                  </button>
                ) : (
                  <a
                    className="real-start-dock-btn"
                    href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  >
                    <span className="real-start-dock-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="real-start-dock-label">{t(item.labelKey)}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {aboutSubmenuOpen ? (
          <nav className="real-start-about-dock" aria-label={t('realStartAbout')}>
            <ul className="real-start-about-dock-list">
              {aboutSubmenuItems.map((item) => (
                <li key={item.id}>
                  {item.onClick ? (
                    <button type="button" className="real-start-dock-btn" onClick={item.onClick}>
                      <span className="real-start-dock-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="real-start-dock-label">{t(item.labelKey)}</span>
                    </button>
                  ) : (
                    <a
                      className="real-start-dock-btn"
                      href={item.href}
                      {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    >
                      <span className="real-start-dock-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="real-start-dock-label">{t(item.labelKey)}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        </div>
      </div>
      </div>
      </div>
      {languageMounted ? (
        <RealLanguagePage
          onClose={closeLanguage}
          onAnimationEnd={handleLanguageAnimationEnd}
        />
      ) : null}
    </div>
  )
}
