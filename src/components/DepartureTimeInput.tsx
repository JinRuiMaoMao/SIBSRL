import { useEffect, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import {
  buildDepartureTimeInput,
  parseDepartureTimeParts,
  type DepartureTimePeriod,
} from '../utils/routeTimetableFeasibility'

interface DepartureTimeInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  label?: string
}

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1))
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

function tryBuildValue(hour: string, minute: string, period: DepartureTimePeriod | ''): string | null {
  if (!hour || !minute || !period) return null
  try {
    return buildDepartureTimeInput({
      hour12: Number(hour),
      minute: Number(minute),
      period,
    })
  } catch {
    return null
  }
}

export function DepartureTimeInput({ value, onChange, className = '', label }: DepartureTimeInputProps) {
  const { t } = useLocale()
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('')
  const [period, setPeriod] = useState<DepartureTimePeriod | ''>('')

  useEffect(() => {
    const parts = parseDepartureTimeParts(value)
    if (parts) {
      setHour(String(parts.hour12))
      setMinute(String(parts.minute).padStart(2, '0'))
      setPeriod(parts.period)
      return
    }
    if (!value) {
      setHour('')
      setMinute('')
      setPeriod('')
    }
  }, [value])

  const groupLabel = label ?? t('betweenStopsDepartLabel')

  const emitChange = (nextHour: string, nextMinute: string, nextPeriod: DepartureTimePeriod | '') => {
    if (!nextHour && !nextMinute && !nextPeriod) {
      onChange('')
      return
    }
    const built = tryBuildValue(nextHour, nextMinute, nextPeriod)
    if (built) onChange(built)
  }

  const handleClear = () => {
    setHour('')
    setMinute('')
    setPeriod('')
    onChange('')
  }

  return (
    <div
      className={`depart-time-input ${className}`.trim()}
      role="group"
      aria-label={groupLabel}
    >
      <select
        className="depart-time-select"
        value={hour}
        aria-label={t('departTimeHour')}
        onChange={(event) => {
          const nextHour = event.target.value
          setHour(nextHour)
          emitChange(nextHour, minute, period)
        }}
      >
        <option value="">{t('departTimePlaceholderHour')}</option>
        {HOURS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="depart-time-sep" aria-hidden="true">
        :
      </span>
      <select
        className="depart-time-select"
        value={minute}
        aria-label={t('departTimeMinute')}
        onChange={(event) => {
          const nextMinute = event.target.value
          setMinute(nextMinute)
          emitChange(hour, nextMinute, period)
        }}
      >
        <option value="">{t('departTimePlaceholderMinute')}</option>
        {MINUTES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="depart-time-period" role="group" aria-label={t('departTimePeriod')}>
        {(['am', 'pm'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`depart-time-period-btn ${period === option ? 'is-active' : ''}`.trim()}
            aria-pressed={period === option}
            onClick={() => {
              setPeriod(option)
              emitChange(hour, minute, option)
            }}
          >
            {t(option === 'am' ? 'departTimeAm' : 'departTimePm')}
          </button>
        ))}
      </div>
      {value ? (
        <button
          type="button"
          className="depart-time-clear"
          onClick={handleClear}
          aria-label={t('departTimeClear')}
          title={t('departTimeClear')}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
