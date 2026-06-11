import { versionUpdates } from '../data/versionUpdates'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import { UpdatesEasterEgg } from './UpdatesEasterEgg'

export function VersionUpdatesPage() {
  const { t, locale } = useLocale()

  return (
    <div className="content content--single">
      <p className="page-intro">{t('updatesIntro')}</p>

      <section className="updates-section">
        <h2 className="section-title">{t('updatesList')}</h2>
        {versionUpdates.length === 0 ? (
          <p className="empty">{t('updatesEmpty')}</p>
        ) : (
          <ol className="updates-list">
            {versionUpdates.map((entry) => (
              <li key={entry.id} className="updates-card">
                <div className="updates-head">
                  <h3 className="updates-title">{getPrimaryText(entry.title, locale)}</h3>
                  <time className="updates-date">{entry.date}</time>
                </div>
                {entry.groups?.length ? (
                  <div className="updates-groups">
                    {entry.groups.map((group, groupIdx) => (
                      <section key={`${entry.id}-group-${groupIdx}`} className="updates-group">
                        <h4 className="updates-group-title">
                          {getPrimaryText(group.title, locale)}
                        </h4>
                        <ul className="updates-items">
                          {group.items.map((item, idx) => (
                            <li key={`${entry.id}-g${groupIdx}-${idx}`}>
                              {getPrimaryText(item, locale)}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                    {entry.easterEggHex ? (
                      <section className="updates-group updates-easter-egg-section">
                        {entry.easterEggTitle ? (
                          <h4 className="updates-group-title">
                            {getPrimaryText(entry.easterEggTitle, locale)}
                          </h4>
                        ) : null}
                        <UpdatesEasterEgg hex={entry.easterEggHex} />
                      </section>
                    ) : null}
                  </div>
                ) : entry.easterEggHex ? (
                  <section className="updates-easter-egg-section">
                    {entry.easterEggTitle ? (
                      <h4 className="updates-group-title">
                        {getPrimaryText(entry.easterEggTitle, locale)}
                      </h4>
                    ) : null}
                    <UpdatesEasterEgg hex={entry.easterEggHex} />
                  </section>
                ) : (
                  <ul className="updates-items">
                    {(entry.items ?? []).map((item, idx) => (
                      <li key={`${entry.id}-${idx}`}>{getPrimaryText(item, locale)}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
