import { useEffect, useId, useRef } from 'react'

export interface CalendarNavPickerOption {
  value: number
  label: string
  badge?: number
}

interface DailyChallengeCalendarNavPickerProps {
  label: string
  value: number
  options: CalendarNavPickerOption[]
  ariaLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: number) => void
}

export function DailyChallengeCalendarNavPicker({
  label,
  value,
  options,
  ariaLabel,
  open,
  onOpenChange,
  onChange,
}: DailyChallengeCalendarNavPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, onOpenChange])

  return (
    <div
      ref={rootRef}
      className={`daily-challenge-calendar-nav-picker ${open ? 'is-open' : ''}`.trim()}
    >
      <span className="daily-challenge-calendar-nav-label">{label}</span>
      <button
        type="button"
        className="daily-challenge-calendar-nav-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => onOpenChange(!open)}
      >
        <span className="daily-challenge-calendar-nav-picker-value">
          {selected?.label ?? String(value)}
        </span>
        {selected?.badge != null ? (
          <span
            className={`daily-challenge-calendar-nav-picker-badge ${selected.badge > 0 ? 'has-hits' : 'is-zero'}`.trim()}
          >
            {selected.badge}
          </span>
        ) : null}
        <span className="daily-challenge-calendar-nav-picker-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          id={listboxId}
          className="daily-challenge-calendar-nav-picker-panel sibs-scrollbar"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`daily-challenge-calendar-nav-picker-option ${option.value === value ? 'is-selected' : ''} ${option.badge != null && option.badge > 0 ? 'has-search-hits' : option.badge === 0 ? 'has-search-zero' : ''}`.trim()}
                onClick={() => {
                  onChange(option.value)
                  onOpenChange(false)
                }}
              >
                <span className="daily-challenge-calendar-nav-picker-option-label">{option.label}</span>
                {option.badge != null ? (
                  <span
                    className={`daily-challenge-calendar-nav-picker-option-badge ${option.badge > 0 ? 'has-hits' : 'is-zero'}`.trim()}
                  >
                    {option.badge}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
