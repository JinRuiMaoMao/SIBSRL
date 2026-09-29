import { useEffect, type AnimationEvent } from 'react'
import { REAL_START_CREDIT_SECTIONS } from '../data/realStartCredits'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { RobloxHeadshotImage } from './RobloxHeadshotImage'
import { robloxProfileUrl } from '../utils/robloxAvatar'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'
import { RealStartOverlayShell } from './RealStartOverlayShell'

export function RealStartCreditsPage({
  onClose,
  onAnimationEnd,
}: {
  onClose: () => void
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
}) {
  const { locale, t } = useLocale()

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
    document.title = t('realStartCreditsPageDocumentTitle')
  }, [locale, t])

  return (
    <RealStartOverlayShell title={t('realStartCredit')} onClose={onClose} onAnimationEnd={onAnimationEnd}>
      <div className="real-start-credits-scroll sibs-scrollbar">
        <p className="real-start-credits-thanks">{t('realStartCreditsThanks')}</p>
        {REAL_START_CREDIT_SECTIONS.map((section) => (
          <section key={section.title.en} className="real-start-credits-section">
            <h2 className="real-start-credits-section-title">{getPrimaryText(section.title, locale)}</h2>
            <ul className={`real-start-credits-grid real-start-credits-grid--${section.layout}`}>
              {section.members.map((member, index) => {
                const role = member.role ? getPrimaryText(member.role, locale) : null
                const profileHref = robloxProfileUrl(member.userId)
                const body = (
                  <>
                    <RobloxHeadshotImage
                      userId={member.userId}
                      displayName={member.displayName}
                      className="real-start-credits-avatar"
                      size={48}
                    />
                    <span className="real-start-credits-copy">
                      <span className="real-start-credits-name">{member.displayName}</span>
                      {role ? <span className="real-start-credits-role">{role}</span> : null}
                    </span>
                  </>
                )
                return (
                  <li key={`${section.title.en}-${member.userId}-${member.role?.en ?? 'member'}-${index}`}>
                    <a className="real-start-credits-card" href={profileHref} target="_blank" rel="noreferrer">
                      {body}
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </RealStartOverlayShell>
  )
}
