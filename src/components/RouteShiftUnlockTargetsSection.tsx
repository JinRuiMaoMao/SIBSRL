import { useLocale } from '../i18n/LocaleContext'
import type { RouteShiftUnlockTarget } from '../data/routeShiftUnlocks'

interface RouteShiftUnlockTargetsSectionProps {
  targets: readonly RouteShiftUnlockTarget[]
  className?: string
}

function StarGlyph() {
  return (
    <svg className="route-shift-unlock-star" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.5 14.6 9l6.9.5-5.2 4.4 1.6 6.7L12 17.8 5.1 20.6l1.6-6.7-5.2-4.4 6.9-.5z"
      />
    </svg>
  )
}

export function RouteShiftUnlockTargetsSection({
  targets,
  className = '',
}: RouteShiftUnlockTargetsSectionProps) {
  const { t } = useLocale()
  if (targets.length === 0) return null

  return (
    <section className={`route-shift-unlock-targets ${className}`.trim()} aria-label={t('unlockRequirements')}>
      {targets.map((target) => (
        <div key={target.targetRouteId} className="route-shift-unlock-target-item">
          <StarGlyph />
          <div className="route-shift-unlock-target-copy">
            <p className="route-shift-unlock-target-title">
              {t('routeUnlockShiftTargetChance', { route: target.targetRouteNumber })}
            </p>
            <p className="route-shift-unlock-target-desc">
              {t('routeUnlockShiftTargetGuaranteed', { n: target.guaranteedShifts })}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}
