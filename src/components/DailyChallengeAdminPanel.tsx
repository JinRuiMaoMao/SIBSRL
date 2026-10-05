import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchDailyChallengeAdminHistory,
  saveDailyChallengeDays,
  type DailyChallengeDayPayload,
} from '../api/userApi'
import { useAuth } from '../contexts/AuthContext'
import { useAppDialog } from '../contexts/AppDialogContext'
import { todayHktDateString } from '../data/dailyChallenge'
import { useLocale } from '../i18n/LocaleContext'
import {
  addCalendarDays,
  buildMonthRowSkeleton,
  mergeParsedDaysIntoRows,
  parseDailyChallengeMonthPaste,
} from '../utils/parseDailyChallengeMonthPaste'

interface AdminRow {
  date: string
  event: string
  routeCode: string
  race: boolean
}

function toAdminRow(day: DailyChallengeDayPayload): AdminRow {
  return {
    date: day.date,
    event: day.event,
    routeCode: day.routeCode ?? '',
    race: day.race,
  }
}

function emptyRow(date: string): AdminRow {
  return { date, event: '', routeCode: '', race: false }
}

export function DailyChallengeAdminPanel() {
  const { t } = useLocale()
  const { alert } = useAppDialog()
  const { token, mapAuthError } = useAuth()
  const monthKey = todayHktDateString().slice(0, 7)

  const [pasteText, setPasteText] = useState('')
  const [rows, setRows] = useState<AdminRow[]>(() => buildMonthRowSkeleton(monthKey))
  const [mergeSummary, setMergeSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const stored = await fetchDailyChallengeAdminHistory()
      const monthDays = stored.filter((day) => day.date.startsWith(monthKey))
      setRows(buildMonthRowSkeleton(monthKey, monthDays.map(toAdminRow)))
    } catch (error) {
      setRows(buildMonthRowSkeleton(monthKey))
      await alert({ message: t(mapAuthError(error)) })
    } finally {
      setLoading(false)
    }
  }, [alert, monthKey, t])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const savableCount = useMemo(
    () => rows.filter((row) => row.event.trim()).length,
    [rows],
  )

  const handleParsePaste = async () => {
    const trimmed = pasteText.trim()
    if (!trimmed) {
      await alert({ message: t('dcAdminPasteEmpty') })
      return
    }

    const parsed = parseDailyChallengeMonthPaste(trimmed, {
      year: Number(monthKey.slice(0, 4)),
    })
    if (parsed.days.length === 0) {
      await alert({ message: t('dcAdminParseNone') })
      return
    }

    const targetMonth = parsed.monthKey
    let baseRows = rows
    if (targetMonth !== monthKey) {
      baseRows = buildMonthRowSkeleton(targetMonth)
    }

    const { rows: merged, added, updated } = mergeParsedDaysIntoRows(baseRows, parsed.days)
    setRows(merged)
    setMergeSummary(
      t('dcAdminMergeSummary', {
        added: String(added),
        updated: String(updated),
        skipped: String(parsed.skippedEmpty),
      }),
    )
  }

  const handleAddRow = () => {
    const lastDate = rows.at(-1)?.date ?? todayHktDateString()
    setRows((current) => [...current, emptyRow(addCalendarDays(lastDate, 1))])
  }

  const handleSave = async () => {
    if (!token) return
    const days = rows
      .filter((row) => row.event.trim())
      .map((row) => ({
        date: row.date,
        event: row.event.trim(),
        routeCode: row.routeCode.trim() ? row.routeCode.trim().toUpperCase() : null,
        race: row.race,
      }))

    if (days.length === 0) {
      await alert({ message: t('dcAdminSaveEmpty') })
      return
    }

    setBusy(true)
    try {
      const result = await saveDailyChallengeDays(token, days)
      await alert({ message: t('dcAdminSaveSuccess', { count: String(result.saved) }) })
      setMergeSummary(null)
      await loadRows()
    } catch (error) {
      await alert({ message: t(mapAuthError(error)) })
    } finally {
      setBusy(false)
    }
  }

  const updateRow = (index: number, patch: Partial<AdminRow>) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    )
  }

  return (
    <section className="account-profile-card dc-admin-panel">
      <h3 className="account-section-title">{t('dcAdminTitle')}</h3>
      <p className="settings-hint">{t('dcAdminLead')}</p>

      <label className="settings-field">
        <span className="settings-field-label">{t('dcAdminPasteLabel')}</span>
        <textarea
          className="settings-input dc-admin-paste"
          rows={8}
          value={pasteText}
          placeholder={t('dcAdminPastePlaceholder')}
          onChange={(event) => setPasteText(event.target.value)}
        />
      </label>
      <div className="settings-action-row">
        <button
          type="button"
          className="settings-action-btn"
          disabled={busy}
          onClick={() => void handleParsePaste()}
        >
          {t('dcAdminParseAction')}
        </button>
      </div>
      {mergeSummary ? <p className="settings-hint dc-admin-merge-summary">{mergeSummary}</p> : null}

      <div className="dc-admin-table-wrap">
        <table className="dc-admin-table">
          <thead>
            <tr>
              <th>{t('dcAdminColDate')}</th>
              <th>{t('dcAdminColRace')}</th>
              <th>{t('dcAdminColEvent')}</th>
              <th>{t('dcAdminColRoute')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="dc-admin-loading">
                  {t('dcAdminLoading')}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.date}>
                  <td className="dc-admin-date">{row.date}</td>
                  <td className="dc-admin-race">
                    <input
                      type="checkbox"
                      checked={row.race}
                      aria-label={t('dcAdminColRace')}
                      onChange={(event) => updateRow(index, { race: event.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      className="settings-input dc-admin-cell"
                      type="text"
                      value={row.event}
                      placeholder={t('dcAdminEventPlaceholder')}
                      onChange={(event) => updateRow(index, { event: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="settings-input dc-admin-cell"
                      type="text"
                      value={row.routeCode}
                      placeholder={t('dcAdminRoutePlaceholder')}
                      onChange={(event) => updateRow(index, { routeCode: event.target.value })}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="settings-action-row">
        <button type="button" className="settings-action-btn" disabled={busy} onClick={handleAddRow}>
          {t('dcAdminAddRow')}
        </button>
        <button
          type="button"
          className="settings-action-btn"
          disabled={busy || loading || savableCount === 0}
          onClick={() => void handleSave()}
        >
          {busy ? t('dcAdminSaving') : t('dcAdminSaveAction', { count: String(savableCount) })}
        </button>
      </div>
    </section>
  )
}
