import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { REAL_START_MENU_LAYOUT } from '../data/realStartMenuLayout'
import { useRealStartMenuScale } from '../hooks/useRealStartMenuScale'
import { getStartPageExternalLinkUrl } from '../data/startPageLinks'
import { getSiteLogoUrl } from '../data/siteBrand'
import { useRealLayoutBackgroundMusic } from '../hooks/useRealLayoutBackgroundMusic'
import { useStartPageBoot } from '../hooks/useStartPageBoot'
import { useLocale } from '../i18n/LocaleContext'
import { getTabPageHref } from '../utils/appTabNavigation'
import { navigateRealShellTab } from '../utils/realShellNavigation'
import { preserveAppHistoryState } from '../utils/appHistoryState'
import { readPublishedBuild } from '../utils/buildLabel'
import { formatRealStartMenuVersion } from '../utils/realStartVersionLabel'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'
import { dispatchRealHudAction } from '../utils/realHudEvents'
import { RealLanguagePage } from './RealLanguagePage'
import { RealStartBackground } from './RealStartBackground'
import { RealStartChangeLogPage } from './RealStartChangeLogPage'
import { RealStartCreditsPage } from './RealStartCreditsPage'
import { RealStartFaqPage } from './RealStartFaqPage'
import { RealStartRightPanel } from './RealStartRightPanel'
import {
  RealStartDockAboutIcon,
  RealStartDockChangeLogIcon,
  RealStartDockCreditIcon,
  RealStartDockFaqIcon,
  RealStartDockMusicIcon,
  RealStartDockShopIcon,
  RealStartLanguageIcon,
  RealStartPlayIcon,
  RealStartProfileIcon,
  RealStartServersIcon,
} from './RealStartGameIcons'
import { isAppReduceMotionEnabled } from '../storage/appPreferences'
import { REAL_SHELL_TRANSITION_MS } from '../utils/realShellTransition'

const REAL_START_OVERLAY_TRANSITION_MS = REAL_SHELL_TRANSITION_MS

type OverlayViewPhase = 'closed' | 'opening' | 'open' | 'closing'
type StartOverlayId = 'language' | 'faq' | 'changelog' | 'credits'

interface RealStartMenuItem {
  id: string
  labelKey: 'realStartPlay' | 'realStartServers' | 'realStartProfile' | 'language'
  icon: ReactNode
  tone: 'green' | 'purple'
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
  icon: ReactNode
  external?: boolean
  onClick?: () => void
  toggleSubmenu?: boolean
  ariaPressed?: boolean
  shop?: boolean
}

export function RealStartPage({ sharedBackground = false }: { sharedBackground?: boolean }) {
  const bootReady = useStartPageBoot()
  const { locale, t } = useLocale()
  const { muted, toggleMuted, retryPlay } = useRealLayoutBackgroundMusic('music-main-menu', {
    loadTrack: !sharedBackground,
  })
  const [overlayId, setOverlayId] = useState<StartOverlayId | null>(null)
  const [overlayPhase, setOverlayPhase] = useState<OverlayViewPhase>('closed')
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
  const overlayMounted = overlayPhase !== 'closed'
  const overlayActive = overlayMounted
  const versionLabel = formatRealStartMenuVersion(readPublishedBuild() ?? __APP_BUILD__)
  const robloxHref = getStartPageExternalLinkUrl('roblox', locale)

  const openRoutes = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    navigateRealShellTab('routes')
  }

  const openOverlay = useCallback((id: StartOverlayId) => {
    setAboutSubmenuOpen(false)
    if (isAppReduceMotionEnabled()) {
      setOverlayId(id)
      setOverlayPhase('open')
      return
    }
    setOverlayId(id)
    setOverlayPhase('opening')
  }, [])

  const closeOverlay = useCallback(() => {
    if (overlayPhase === 'closed' || overlayPhase === 'closing') return
    if (isAppReduceMotionEnabled()) {
      setOverlayPhase('closed')
      setOverlayId(null)
      return
    }
    setOverlayPhase('closing')
  }, [overlayPhase])

  const handleOverlayAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return
      const name = event.animationName
      if (overlayPhase === 'opening' && name.includes('real-shell-slide-up-from-bottom')) {
        setOverlayPhase('open')
      } else if (overlayPhase === 'closing' && name.includes('real-shell-slide-down-out')) {
        setOverlayPhase('closed')
        setOverlayId(null)
      }
    },
    [overlayPhase],
  )

  useEffect(() => {
    if (overlayPhase !== 'opening' && overlayPhase !== 'closing') return
    const closing = overlayPhase === 'closing'
    const timer = window.setTimeout(() => {
      setOverlayPhase((phase) => {
        if (phase === 'opening') return 'open'
        if (phase === 'closing') return 'closed'
        return phase
      })
      if (closing) setOverlayId(null)
    }, REAL_START_OVERLAY_TRANSITION_MS + 80)
    return () => window.clearTimeout(timer)
  }, [overlayPhase])

  const mainMenu: RealStartMenuItem[] = [
    {
      id: 'play',
      href: getTabPageHref('routes'),
      labelKey: 'realStartPlay',
      icon: <RealStartPlayIcon />,
      tone: 'green',
      linkOnClick: openRoutes,
    },
    {
      id: 'servers',
      href: robloxHref,
      labelKey: 'realStartServers',
      icon: <RealStartServersIcon />,
      tone: 'green',
      external: true,
    },
    {
      id: 'profile',
      labelKey: 'realStartProfile',
      icon: <RealStartProfileIcon />,
      tone: 'purple',
      onClick: () => dispatchRealHudAction({ type: 'open-profile', tab: 'stats' }),
    },
    {
      id: 'language',
      labelKey: 'language',
      icon: <RealStartLanguageIcon />,
      tone: 'purple',
      onClick: () => openOverlay('language'),
    },
  ]

  const toggleAboutSubmenu = useCallback(() => {
    setAboutSubmenuOpen((open) => !open)
  }, [])

  const mainDockItems: RealStartDockItem[] = [
    {
      id: 'music',
      labelKey: 'tabMusic',
      icon: <RealStartDockMusicIcon muted={muted} />,
      onClick: toggleMuted,
    },
    {
      id: 'faq',
      labelKey: 'realStartFaq',
      icon: <RealStartDockFaqIcon />,
      onClick: () => openOverlay('faq'),
    },
    {
      id: 'about',
      labelKey: 'realStartAbout',
      icon: <RealStartDockAboutIcon />,
      onClick: toggleAboutSubmenu,
      toggleSubmenu: true,
      ariaPressed: aboutSubmenuOpen,
    },
    {
      id: 'shop',
      labelKey: 'realStartShop',
      icon: <RealStartDockShopIcon />,
      onClick: () => dispatchRealHudAction({ type: 'open-shop' }),
      shop: true,
    },
  ]

  const aboutSubmenuItems: RealStartDockItem[] = [
    {
      id: 'changelog',
      labelKey: 'realStartChangeLog',
      icon: <RealStartDockChangeLogIcon />,
      onClick: () => openOverlay('changelog'),
    },
    {
      id: 'credit',
      labelKey: 'realStartCredit',
      icon: <RealStartDockCreditIcon />,
      onClick: () => openOverlay('credits'),
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
    openOverlay('language')
  }, [openOverlay])

  useEffect(() => {
    if (!bootReady || muted || overlayActive) return
    retryPlay()
  }, [bootReady, overlayActive, muted, retryPlay])

  return (
    <div
      className={`real-start-stack${sharedBackground ? ' real-start-stack--shared-background' : ''}${!sharedBackground && bootReady ? ' real-start-stack--ready' : ''}`}
      data-start-overlay-phase={overlayPhase}
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

                <aside className="real-start-featured" aria-label={t('realStartFeaturedPanel')}>
                  <RealStartRightPanel onOpenChangeLog={() => openOverlay('changelog')} />
                </aside>
              </div>

              <p className="real-start-version">{versionLabel}</p>
            </div>

            <div className="real-start-menu-rb">
              <nav className="real-start-dock" aria-label={t('startPageCommunityLinks')}>
                <ul className="real-start-dock-list">
                  {mainDockItems.map((item) => (
                    <li key={item.id}>
                      {item.onClick ? (
                        <button
                          type="button"
                          className={`real-start-dock-btn${item.id === 'music' && muted ? ' real-start-dock-btn--muted' : ''}${item.toggleSubmenu && item.ariaPressed ? ' real-start-dock-btn--active' : ''}${item.shop ? ' real-start-dock-btn--shop' : ''}`}
                          onClick={item.onClick}
                          aria-pressed={
                            item.id === 'music' ? muted : item.toggleSubmenu ? item.ariaPressed : undefined
                          }
                          aria-label={
                            item.id === 'music'
                              ? t(muted ? 'realStartMusicUnmute' : 'realStartMusicMute')
                              : t(item.labelKey)
                          }
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
      {overlayMounted && overlayId === 'language' ? (
        <RealLanguagePage onClose={closeOverlay} onAnimationEnd={handleOverlayAnimationEnd} />
      ) : null}
      {overlayMounted && overlayId === 'faq' ? (
        <RealStartFaqPage onClose={closeOverlay} onAnimationEnd={handleOverlayAnimationEnd} />
      ) : null}
      {overlayMounted && overlayId === 'changelog' ? (
        <RealStartChangeLogPage onClose={closeOverlay} onAnimationEnd={handleOverlayAnimationEnd} />
      ) : null}
      {overlayMounted && overlayId === 'credits' ? (
        <RealStartCreditsPage onClose={closeOverlay} onAnimationEnd={handleOverlayAnimationEnd} />
      ) : null}
    </div>
  )
}
