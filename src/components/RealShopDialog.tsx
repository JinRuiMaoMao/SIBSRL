import { useEffect, useState } from 'react'
import {
  REAL_SHOP_BOOSTS,
  REAL_SHOP_DONATION_LEADERS,
  REAL_SHOP_DONATION_TIERS,
  REAL_SHOP_PASS_IDS,
  REAL_SHOP_SHARDS,
  REAL_SHOP_TAB_ORDER,
  REAL_SHOP_USER_DONATED,
  type RealShopPassId,
  type RealShopTabId,
} from '../data/realShopCatalog'
import { getStartPageExternalLinkUrl } from '../data/startPageLinks'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import { lockPageScroll } from '../utils/pageScrollLock'

interface RealShopDialogProps {
  open: boolean
  onClose: () => void
}

const TAB_LABEL_KEYS: Record<RealShopTabId, MessageKey> = {
  pass: 'realShopTabPass',
  boost: 'realShopTabBoost',
  shards: 'realShopTabShards',
  donate: 'realShopTabDonate',
}

const PASS_TITLE_KEYS: Record<RealShopPassId, MessageKey> = {
  vip: 'realShopPassVipTitle',
  developer: 'realShopPassDevTitle',
  ultimate: 'realShopPassUltimateTitle',
  master: 'realShopPassMasterTitle',
}

const PASS_PERK_KEYS: Record<RealShopPassId, MessageKey[]> = {
  vip: ['realShopPassVipPerk1', 'realShopPassVipPerk2', 'realShopPassVipPerk3', 'realShopPassVipPerk4'],
  developer: ['realShopPassDevPerk1', 'realShopPassDevPerk2', 'realShopPassDevPerk3', 'realShopPassDevPerk4'],
  ultimate: ['realShopPassUltBoostPerk1', 'realShopPassUltBoostPerk2', 'realShopPassUltBoostPerk3'],
  master: ['realShopPassMasterPerk1', 'realShopPassMasterPerk2'],
}

const BOOST_TITLE_KEYS: Record<string, MessageKey> = {
  'exp-15': 'realShopBoostExp15Title',
  'exp-30': 'realShopBoostExp30Title',
  'shards-20': 'realShopBoostShardsTitle',
}

const BOOST_DESC_KEYS: Record<string, MessageKey> = {
  'exp-15': 'realShopBoostExp15Desc',
  'exp-30': 'realShopBoostExp30Desc',
  'shards-20': 'realShopBoostShardsDesc',
}

function RobuxPrice({ amount }: { amount: number }) {
  return (
    <span className="real-shop-robux-price">
      <span className="real-shop-robux-icon" aria-hidden="true">
        ⬡
      </span>
      <span>{amount.toLocaleString()}</span>
    </span>
  )
}

function GiftButton({ onClick }: { onClick: () => void }) {
  const { t } = useLocale()
  return (
    <button type="button" className="real-shop-gift-btn" onClick={onClick}>
      <span aria-hidden="true">🎁</span>
      {t('realShopGift')}
    </button>
  )
}

function PassVisual({ passId }: { passId: RealShopPassId }) {
  if (passId === 'vip') {
    return (
      <div className="real-shop-pass-visual real-shop-pass-visual--vip">
        <span className="real-shop-pass-visual-vip">VIP</span>
        <span className="real-shop-pass-visual-vip-sub">Membership</span>
      </div>
    )
  }
  if (passId === 'developer') {
    return (
      <div className="real-shop-pass-visual real-shop-pass-visual--dev">
        <span className="real-shop-pass-visual-dev-badge">A</span>
        <span className="real-shop-pass-visual-dev-label">DEVELOPER ACCESS</span>
      </div>
    )
  }
  if (passId === 'ultimate') {
    return (
      <div className="real-shop-pass-visual real-shop-pass-visual--ultimate">
        <span className="real-shop-pass-visual-exp-badge">2X EXP</span>
        <span className="real-shop-pass-visual-ultimate-label">Ultimate Boost</span>
      </div>
    )
  }
  return (
    <div className="real-shop-pass-visual real-shop-pass-visual--master">
      <span className="real-shop-pass-visual-master-card">MASTER MEMBER</span>
    </div>
  )
}

export function RealShopDialog({ open, onClose }: RealShopDialogProps) {
  const { locale, t } = useLocale()
  const [tab, setTab] = useState<RealShopTabId>('pass')
  const robloxHref = getStartPageExternalLinkUrl('roblox', locale)

  const openRoblox = () => {
    window.open(robloxHref, '_blank', 'noopener,noreferrer')
  }

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

  return (
    <div className="real-shop-root">
      <button type="button" className="real-shop-backdrop" aria-label={t('realShopClose')} onClick={onClose} />
      <div
        className="real-shop-panel sibs-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="real-shop-dialog-title"
      >
        <h2 id="real-shop-dialog-title" className="sr-only">
          {t('realStartShop')}
        </h2>
        <div className="real-shop-top">
          <div className="real-shop-tabs" role="tablist" aria-label={t('realStartShop')}>
            {REAL_SHOP_TAB_ORDER.map((tabId) => (
              <button
                key={tabId}
                type="button"
                role="tab"
                aria-selected={tab === tabId}
                className={`real-shop-tab${tab === tabId ? ' real-shop-tab--active' : ''}`}
                onClick={() => setTab(tabId)}
              >
                {t(TAB_LABEL_KEYS[tabId])}
              </button>
            ))}
            <button type="button" className="real-shop-tab real-shop-tab--gift" onClick={openRoblox}>
              <span aria-hidden="true">🎁</span>
              {t('realShopGift')}
            </button>
          </div>
          <button type="button" className="real-shop-close" onClick={onClose} aria-label={t('realShopClose')}>
            ×
          </button>
        </div>

        <div className="real-shop-body">
          {tab === 'pass' ? (
            <div className="real-shop-pass-grid">
              {REAL_SHOP_PASS_IDS.map((passId) => (
                <article key={passId} className={`real-shop-pass-card real-shop-pass-card--${passId}`}>
                  <div className="real-shop-pass-card-left">
                    <PassVisual passId={passId} />
                    <p className="real-shop-owned">{t('realShopOwned')}</p>
                    <GiftButton onClick={openRoblox} />
                  </div>
                  <div className="real-shop-pass-card-right">
                    <h3 className="real-shop-pass-card-title">{t(PASS_TITLE_KEYS[passId])}</h3>
                    <ul className="real-shop-pass-perks">
                      {PASS_PERK_KEYS[passId].map((key) => (
                        <li key={key}>{t(key)}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {tab === 'boost' ? (
            <div className="real-shop-boost-list">
              {REAL_SHOP_BOOSTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`real-shop-boost-card real-shop-boost-card--${item.theme}`}
                  onClick={openRoblox}
                >
                  <span className="real-shop-boost-icon" aria-hidden="true">
                    {item.theme === 'gold' ? '☀ 200%' : item.id === 'exp-30' ? '+ 300%' : '+ 150%'}
                  </span>
                  <span className="real-shop-boost-copy">
                    <strong>{t(BOOST_TITLE_KEYS[item.id]!)}</strong>
                    <span>{t(BOOST_DESC_KEYS[item.id]!)}</span>
                  </span>
                  <RobuxPrice amount={item.price} />
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'shards' ? (
            <div className="real-shop-shards-layout">
              <div className="real-shop-shards-grid">
                {REAL_SHOP_SHARDS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`real-shop-shard-card${item.wide ? ' real-shop-shard-card--wide' : ''}`}
                    onClick={openRoblox}
                  >
                    {item.badge ? (
                      <span className={`real-shop-shard-badge real-shop-shard-badge--${item.badge}`}>
                        {t(item.badge === 'popular' ? 'realShopShardPopular' : 'realShopShardBestValue')}
                      </span>
                    ) : null}
                    <span className="real-shop-shard-amount">
                      {item.amount.toLocaleString()}
                      <span className="real-shop-shard-sun" aria-hidden="true">
                        ☀
                      </span>
                    </span>
                    <RobuxPrice amount={item.price} />
                  </button>
                ))}
              </div>
              <div className="real-shop-shards-decor" aria-hidden="true">
                <span className="real-shop-shards-sun real-shop-shards-sun--a">☀</span>
                <span className="real-shop-shards-sun real-shop-shards-sun--b">☀</span>
                <span className="real-shop-shards-crate">📦</span>
              </div>
            </div>
          ) : null}

          {tab === 'donate' ? (
            <div className="real-shop-donate-layout">
              <div className="real-shop-donate-grid">
                {REAL_SHOP_DONATION_TIERS.map((tier) => (
                  <button key={tier.amount} type="button" className="real-shop-donate-tier" onClick={openRoblox}>
                    <RobuxPrice amount={tier.amount} />
                  </button>
                ))}
              </div>
              <aside className="real-shop-donate-leaderboard">
                <h3 className="real-shop-donate-leaderboard-title">{t('realShopDonateTop')}</h3>
                <ul className="real-shop-donate-leaderboard-list sibs-scrollbar">
                  {REAL_SHOP_DONATION_LEADERS.map((entry) => (
                    <li key={entry.name} className="real-shop-donate-leaderboard-row">
                      <span>{entry.name}</span>
                      <RobuxPrice amount={entry.amount} />
                    </li>
                  ))}
                </ul>
                <p className="real-shop-donate-you">
                  {t('realShopDonateYou', { amount: REAL_SHOP_USER_DONATED })}
                </p>
              </aside>
            </div>
          ) : null}
        </div>

        <p className="real-shop-footnote">
          {tab === 'pass'
            ? t('realShopFootnotePass')
            : tab === 'boost'
              ? t('realShopFootnoteBoost')
              : tab === 'shards'
                ? t('realShopFootnoteShards')
                : t('realShopFootnoteDonate')}
        </p>
      </div>
    </div>
  )
}
