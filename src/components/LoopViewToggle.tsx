import { useLocale } from '../i18n/LocaleContext'

interface LoopViewToggleProps {
  value: boolean
  onChange: (loopView: boolean) => void
  compact?: boolean
  className?: string
}

export function LoopViewToggle({
  value,
  onChange,
  compact = false,
  className = '',
}: LoopViewToggleProps) {
  const { t } = useLocale()

  return (
    <div
      className={`direction-toggle loop-view-toggle ${compact ? 'direction-toggle--compact' : ''} ${className}`.trim()}
      role="tablist"
      aria-label={t('loopViewToggleAria')}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="tab"
        aria-selected={!value}
        className={`direction-toggle-btn ${!value ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onChange(false)
        }}
      >
        {t('loopViewSegment')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value}
        className={`direction-toggle-btn ${value ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onChange(true)
        }}
      >
        {t('loopViewFull')}
      </button>
    </div>
  )
}
