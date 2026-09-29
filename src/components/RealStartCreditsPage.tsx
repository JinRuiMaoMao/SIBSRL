import { useEffect, type AnimationEvent } from 'react'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'
import { REAL_START_CREDIT_SECTIONS } from '../data/realStartCredits'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
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
                const body = (
                  <>
                    <span className="real-start-credits-avatar" aria-hidden="true">
                      {member.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="real-start-credits-copy">
                      <span className="real-start-credits-name">{member.displayName}</span>
                      {role ? <span className="real-start-credits-role">{role}</span> : null}
                    </span>
                  </>
                )
                return (
                  <li key={`${section.title.en}-${member.displayName}-${index}`}>
                    {member.profileUrl ? (
                      <a
                        className="real-start-credits-card"
                        href={member.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {body}
                      </a>
                    ) : (
                      <div className="real-start-credits-card">{body}</div>
                    )}
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
