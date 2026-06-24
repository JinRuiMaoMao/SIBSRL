import type { VersionUpdateEntry as VersionUpdateEntryData } from '../data/versionUpdates'
import {
  CHANGELOG_ADDITIONS_TITLE,
  CHANGELOG_FIXES_TITLE,
} from '../data/changelogStructure'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import { UpdatesEasterEgg } from './UpdatesEasterEgg'

interface VersionUpdateEntryProps {
  entry: VersionUpdateEntryData
  className?: string
  dataTour?: string
}

function UpdateItemList({
  items,
  entryId,
  listKey,
}: {
  items: { zh: string; en: string }[]
  entryId: string
  listKey: string
}) {
  const { locale } = useLocale()

  return (
    <ul className="updates-items">
      {items.map((item, idx) => (
        <li key={`${entryId}-${listKey}-${idx}`}>{getPrimaryText(item, locale)}</li>
      ))}
    </ul>
  )
}

export function VersionUpdateEntry({ entry, className, dataTour }: VersionUpdateEntryProps) {
  const { locale } = useLocale()

  return (
    <article className={className} data-tour={dataTour}>
      <div className="updates-head">
        <h3 className="updates-title">{getPrimaryText(entry.title, locale)}</h3>
        <time className="updates-date">{entry.date}</time>
      </div>
      {entry.groups?.length ? (
        <div className="updates-groups">
          {entry.groups.map((group, groupIdx) => {
            const hasStructuredSections =
              (group.additions?.length ?? 0) > 0 || (group.fixes?.length ?? 0) > 0
            const legacyItems = group.items ?? []

            return (
              <section key={`${entry.id}-group-${groupIdx}`} className="updates-group">
                <h4 className="updates-group-title">{getPrimaryText(group.title, locale)}</h4>
                {hasStructuredSections ? (
                  <div className="updates-sections">
                    {group.additions?.length ? (
                      <section className="updates-section">
                        <h5 className="updates-section-title">
                          {getPrimaryText(CHANGELOG_ADDITIONS_TITLE, locale)}
                        </h5>
                        <UpdateItemList
                          items={group.additions}
                          entryId={entry.id}
                          listKey={`g${groupIdx}-add`}
                        />
                      </section>
                    ) : null}
                    {group.fixes?.length ? (
                      <section className="updates-section">
                        <h5 className="updates-section-title updates-section-title--fixes">
                          {getPrimaryText(CHANGELOG_FIXES_TITLE, locale)}
                        </h5>
                        <UpdateItemList
                          items={group.fixes}
                          entryId={entry.id}
                          listKey={`g${groupIdx}-fix`}
                        />
                      </section>
                    ) : null}
                  </div>
                ) : legacyItems.length ? (
                  <UpdateItemList
                    items={legacyItems}
                    entryId={entry.id}
                    listKey={`g${groupIdx}-legacy`}
                  />
                ) : null}
              </section>
            )
          })}
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
    </article>
  )
}
