import { useEffect, useState, type AnimationEvent } from 'react'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'
import { REAL_START_FAQ_SECTIONS } from '../data/realStartFaq'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { getStartPageExternalLinkUrl } from '../data/startPageLinks'
import { RealStartOverlayShell } from './RealStartOverlayShell'

export function RealStartFaqPage({
  onClose,
  onAnimationEnd,
}: {
  onClose: () => void
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
}) {
  const { locale, t } = useLocale()
  const [openKey, setOpenKey] = useState<string | null>(REAL_START_FAQ_SECTIONS[0]?.items[0]?.question.en ?? null)
  const wikiHref = getStartPageExternalLinkUrl('wiki', locale)

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
    document.title = t('realStartFaqPageDocumentTitle')
  }, [locale, t])

  return (
    <RealStartOverlayShell
      title={t('realStartFaq')}
      onClose={onClose}
      onAnimationEnd={onAnimationEnd}
      footer={
        <p className="real-start-faq-footnote">
          {t('realStartFaqWikiLead')}{' '}
          <a href={wikiHref} target="_blank" rel="noreferrer">
            {t('linkWiki')}
          </a>
        </p>
      }
    >
      <div className="real-start-faq-list sibs-scrollbar">
        {REAL_START_FAQ_SECTIONS.map((section) => (
          <section key={section.title.en} className="real-start-faq-section">
            <h2 className="real-start-faq-section-title">{getPrimaryText(section.title, locale)}</h2>
            <div className="real-start-faq-items">
              {section.items.map((item) => {
                const key = item.question.en
                const open = openKey === key
                return (
                  <article key={key} className={`real-start-faq-item${open ? ' real-start-faq-item--open' : ''}`}>
                    <button
                      type="button"
                      className="real-start-faq-question"
                      aria-expanded={open}
                      onClick={() => setOpenKey(open ? null : key)}
                    >
                      <span>{getPrimaryText(item.question, locale)}</span>
                      <span className="real-start-faq-chevron" aria-hidden="true">
                        {open ? '⌄' : '›'}
                      </span>
                    </button>
                    {open ? (
                      <div className="real-start-faq-answer">{getPrimaryText(item.answer, locale)}</div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </RealStartOverlayShell>
  )
}
