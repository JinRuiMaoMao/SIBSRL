import { ROUTE_NUMBERING } from '../data/routes'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import { isChineseLocale } from '../i18n/types'

export function NumberingGuide() {
  const { locale, t } = useLocale()

  return (
    <section className="numbering-guide">
      <h2>{t('numberingTitle')}</h2>
      <p className="guide-intro">{t('numberingIntro')}</p>
      <div className="guide-cards">
        {ROUTE_NUMBERING.map((item, i) => (
          <article key={i} className="guide-card">
            <h3>{getPrimaryText(item.title, locale)}</h3>
            <p>{getPrimaryText(item.desc, locale)}</p>
            <p className="guide-examples">
              {t('examplesPrefix')}
              {item.examples.join(
                isChineseLocale(locale) || locale === 'ja' ? '、' : ', ',
              )}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
