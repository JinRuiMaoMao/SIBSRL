import { triviaFacts } from '../data/trivia'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'

export function TriviaPage() {
  const { locale, t } = useLocale()

  return (
    <div className="content content--single">
      <p className="page-intro">{t('triviaIntro')}</p>

      <section className="complaints-section" aria-label={t('triviaList')}>
        <h2 className="section-title">{t('triviaList')}</h2>
        {triviaFacts.length === 0 ? (
          <p className="empty-state">{t('triviaEmpty')}</p>
        ) : (
          <ul className="complaints-list">
            {triviaFacts.map((item, index) => (
              <li key={item.id} className="complaints-card">
                <div className="complaints-head">
                  <h3 className="complaints-title">
                    <span className="complaints-no" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span>{getPrimaryText(item.text, locale)}</span>
                  </h3>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
