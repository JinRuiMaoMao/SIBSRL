import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  clearDailyChallengeDays,
  fetchDailyChallengeAdminHistory,
  saveDailyChallengeDays,
  type DailyChallengeDayPayload,
} from '../api/userApi'
import { useAuth } from '../contexts/AuthContext'
import { useAppDialog } from '../contexts/AppDialogContext'
import { todayHktDateString } from '../data/dailyChallenge'
import { DAILY_CHALLENGE_SCHEDULES } from '../data/dailyChallengeSchedule'
import { useLocale } from '../i18n/LocaleContext'
import {
  addCalendarDays,
  buildMonthRowSkeleton,
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

function getStaticDaysForMonth(monthKey: string): DailyChallengeDayPayload[] {
  const schedule = DAILY_CHALLENGE_SCHEDULES.find((entry) => entry.month === monthKey)
  if (!schedule) return []
  return schedule.days
    .filter((day) => day.event)
    .map((day) => ({
      date: day.date,
      event: day.event!,
      routeCode: day.routeCode,
      race: day.race,
    }))
}

function mergeMonthRows(
  monthKey: string,
  apiDays: DailyChallengeDayPayload[],
  staticDays: DailyChallengeDayPayload[],
): AdminRow[] {
  const byDate = new Map<string, AdminRow>()
  for (const day of staticDays) {
    byDate.set(day.date, toAdminRow(day))
  }
  for (const day of apiDays) {
    byDate.set(day.date, toAdminRow(day))
  }
  return buildMonthRowSkeleton(monthKey, [...byDate.values()])
}

export function DailyChallengeAdminPanel() {
  const { t } = useLocale()
  const { alert, confirm } = useAppDialog()
  const { token, mapAuthError } = useAuth()
  const skipMonthReloadRef = useRef(false)

  const [pasteText, setPasteText] = useState('')
  const [viewMonthKey, setViewMonthKey] = useState(() => todayHktDateString().slice(0, 7))
  const [rows, setRows] = useState<AdminRow[]>(() =>
    buildMonthRowSkeleton(todayHktDateString().slice(0, 7)),
  )
  const [mergeSummary, setMergeSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [monthStoredCount, setMonthStoredCount] = useState(0)
  const [totalStoredCount, setTotalStoredCount] = useState(0)

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const stored = await fetchDailyChallengeAdminHistory()
      setTotalStoredCount(stored.length)
      const monthDays = stored.filter((day) => day.date.startsWith(viewMonthKey))
      setMonthStoredCount(monthDays.length)
      const staticDays = getStaticDaysForMonth(viewMonthKey)
      setRows(mergeMonthRows(viewMonthKey, monthDays, staticDays))
    } catch (error) {
      setRows(mergeMonthRows(viewMonthKey, [], getStaticDaysForMonth(viewMonthKey)))
      setMonthStoredCount(0)
      setTotalStoredCount(0)
      await alert({ message: t(mapAuthError(error)) })
    } finally {
      setLoading(false)
    }
  }, [alert, mapAuthError, t, viewMonthKey])

  useEffect(() => {
    if (skipMonthReloadRef.current) {
      skipMonthReloadRef.current = false
      return
    }
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
      year: Number(viewMonthKey.slice(0, 4)),
    })
    if (parsed.days.length === 0) {
      await alert({ message: t('dcAdminParseNone') })
      return
    }

    skipMonthReloadRef.current = true
    setViewMonthKey(parsed.monthKey)
    setRows(buildMonthRowSkeleton(parsed.monthKey, parsed.days))
    setMonthStoredCount(0)
    setMergeSummary(
      t('dcAdminMergeSummary', {
        added: String(parsed.days.length),
        updated: '0',
        skipped: String(parsed.skippedEmpty),
      }),
    )
  }

  const handleAddRow = () => {
    const lastDate = rows.at(-1)?.date ?? todayHktDateString()
    setRows((current) => [...current, emptyRow(addCalendarDays(lastDate, 1))])
  }

  const handleClearMonth = async () => {
    if (!token) return
    const ok = await confirm({
      message: t('dcAdminClearMonthConfirm', { month: viewMonthKey }),
    })
    if (!ok) return

    setBusy(true)
    try {
      const result = await clearDailyChallengeDays(token, { clearMonth: viewMonthKey })
      await alert({
        message: t('dcAdminClearSuccess', {
          deleted: String(result.deleted),
          remaining: String(result.remaining),
        }),
      })
      setMergeSummary(null)
      await loadRows()
    } catch (error) {
      await alert({ message: t(mapAuthError(error)) })
    } finally {
      setBusy(false)
    }
  }

  const handleClearAll = async () => {
    if (!token) return
    const ok = await confirm({ message: t('dcAdminClearAllConfirm') })
    if (!ok) return

    setBusy(true)
    try {
      const result = await clearDailyChallengeDays(token, { clearAll: true })
      await alert({
        message: t('dcAdminClearSuccess', {
          deleted: String(result.deleted),
          remaining: String(result.remaining),
        }),
      })
      setMergeSummary(null)
      await loadRows()
    } catch (error) {
      await alert({ message: t(mapAuthError(error)) })
    } finally {
      setBusy(false)
    }
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
      const replaceMonth = viewMonthKey
      const result = await saveDailyChallengeDays(token, days, { replaceMonth })
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

      <label className="settings-field dc-admin-month-field">
        <span className="settings-field-label">{t('dcAdminMonthLabel')}</span>
        <input
          className="settings-input dc-admin-month-input"
          type="month"
          value={viewMonthKey}
          disabled={busy || loading}
          onChange={(event) => {
            const next = event.target.value
            if (!next) return
            setViewMonthKey(next)
            setMergeSummary(null)
          }}
        />
        <span className="settings-hint">{t('dcAdminMonthHint')}</span>
      </label>

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
        <button
          type="button"
          className="settings-action-btn danger"
          disabled={busy || loading || monthStoredCount === 0}
          onClick={() => void handleClearMonth()}
        >
          {t('dcAdminClearMonthAction')}
        </button>
        <button
          type="button"
          className="settings-action-btn danger"
          disabled={busy || loading || totalStoredCount === 0}
          onClick={() => void handleClearAll()}
        >
          {t('dcAdminClearAllAction')}
        </button>
      </div>
      <p className="settings-hint">
        {t('dcAdminMonthStoredCount', { count: String(monthStoredCount), month: viewMonthKey })}
        {totalStoredCount > 0
          ? ` · ${t('dcAdminStoredCount', { count: String(totalStoredCount) })}`
          : ''}
      </p>
    </section>
  )
}
