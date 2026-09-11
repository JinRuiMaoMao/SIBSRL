import { useEffect, useState } from 'react'
import { getStartPageExternalLinkUrl } from '../data/startPageLinks'
import { useRealDriverProgress } from '../hooks/useRealDriverProgress'
import { useRealSunshardsBalance } from '../hooks/useRealSunshardsBalance'
import { useLocale } from '../i18n/LocaleContext'
import { dispatchRealHudAction, readRealHudAction, REAL_HUD_EVENT } from '../utils/realHudEvents'
import { navigateRealShellTab } from '../utils/realShellNavigation'
import { RealShopDialog } from './RealShopDialog'
import { SunshardIcon } from './SunshardIcon'

function CartGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4m10 0a2 2 0 1 0 .001 3.999A2 2 0 0 0 17 18M6.2 6h14.3l-1.4 7H8.1zM5 4h1.6l1 6h12.7l1.7-8H6.5z"
      />
    </svg>
  )
}

function ClipboardGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M9 3a2 2 0 0 0-2 2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2-2zm0 2h6v2H9zm-2 4h10v11H7z"
      />
      <path fill="currentColor" d="M10 13h4v2h-4zm0-3h4v2h-4z" />
    </svg>
  )
}

function MedalGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2 9.5 8.5 2 9.5l5.8 4.5-2.2 6.8L12 16.8l6.4 4-2.2-6.8L22 9.5 14.5 8.5zm0 4.2 1.4 2.8 3.1.4-2.2 2.1.5 3.1-2.8-1.5-2.8 1.5.5-3.1-2.2-2.1 3.1-.4z"
      />
    </svg>
  )
}

function InviteGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4m0 2c-3.3 0-6 1.8-6 4v1h12v-1c0-2.2-2.7-4-6-4M19 10h-2v2h-2v2h2v2h2v-2h2v-2h-2z"
      />
    </svg>
  )
}

export function RealTopHud({ className }: { className?: string }) {
  const { locale, t } = useLocale()
  const balance = useRealSunshardsBalance()
  const { level, xpCurrent, xpMax } = useRealDriverProgress()
  const [shopOpen, setShopOpen] = useState(false)
  const robloxHref = getStartPageExternalLinkUrl('roblox', locale)
  const xpDenominator = xpMax > 0 ? xpMax : Math.max(xpCurrent, 1)
  const xpRatio = xpMax > 0 ? Math.min(1, xpCurrent / xpMax) : 0

  useEffect(() => {
    const onHudAction = (event: Event) => {
      const action = readRealHudAction(event)
      if (action?.type === 'open-shop') setShopOpen(true)
    }
    window.addEventListener(REAL_HUD_EVENT, onHudAction)
    return () => window.removeEventListener(REAL_HUD_EVENT, onHudAction)
  }, [])

  const openShop = () => setShopOpen(true)

  return (
    <>
      <header
        className={`real-top-hud${className ? ` ${className}` : ''}`}
        role="banner"
        aria-label={t('realTopHudAria')}
      >
        <div className="real-top-hud-left">
          <div className="real-top-hud-level" aria-label={t('realTopHudLevelAria', { n: level })}>
            {level.toLocaleString()}
          </div>
          <div className="real-top-hud-xp">
            <div className="real-top-hud-xp-label" aria-hidden="true">
              {xpCurrent.toLocaleString()} / {xpDenominator.toLocaleString()}
            </div>
            <div
              className="real-top-hud-xp-track"
              role="progressbar"
              aria-label={t('realTopHudXpAria', { current: xpCurrent, max: xpDenominator })}
              aria-valuemin={0}
              aria-valuemax={xpDenominator}
              aria-valuenow={xpCurrent}
            >
              <div className="real-top-hud-xp-fill" style={{ width: `${xpRatio * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="real-top-hud-right">
          <button
            type="button"
            className="real-top-hud-dex"
            onClick={() => navigateRealShellTab('routes')}
          >
            {t('realTopHudDex')}
          </button>

          <div className="real-top-hud-sunshards" aria-label={t('realSunshardsBalanceAria', { count: balance })}>
            <span className="real-top-hud-sunshards-icon-wrap">
              <SunshardIcon className="real-top-hud-sunshards-icon" size={16} />
            </span>
            <span className="real-top-hud-sunshards-count">{balance.toLocaleString()}</span>
            <button
              type="button"
              className="real-top-hud-sunshards-add"
              aria-label={t('realTopHudAddSunshards')}
              onClick={openShop}
            >
              +
            </button>
          </div>

          <button type="button" className="real-top-hud-action" onClick={openShop}>
            <CartGlyph />
            <span>{t('realStartShop')}</span>
          </button>

          <button
            type="button"
            className="real-top-hud-action"
            onClick={() => {
              dispatchRealHudAction({ type: 'open-daily-tasks' })
              navigateRealShellTab('routes')
            }}
          >
            <ClipboardGlyph />
            <span>{t('realTopHudDailyTasks')}</span>
          </button>

          <button
            type="button"
            className="real-top-hud-icon-btn"
            aria-label={t('realTopHudAchievements')}
            onClick={() => dispatchRealHudAction({ type: 'open-profile', tab: 'achievements' })}
          >
            <MedalGlyph />
          </button>

          <button
            type="button"
            className="real-top-hud-invite"
            aria-label={t('realTopHudInviteFriends')}
            onClick={() => window.open(robloxHref, '_blank', 'noopener,noreferrer')}
          >
            <InviteGlyph />
          </button>
        </div>
      </header>

      <RealShopDialog open={shopOpen} onClose={() => setShopOpen(false)} />
    </>
  )
}
