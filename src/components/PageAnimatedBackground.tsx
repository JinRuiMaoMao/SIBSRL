import { useAppPreferences } from '../contexts/AppPreferencesContext'

/** Full-viewport theme gradient backdrop (static; optional subtle base drift). */
export function PageAnimatedBackground() {
  const { reduceMotion } = useAppPreferences()

  return (
    <div
      className={`page-animated-bg${reduceMotion ? ' is-static' : ''}`}
      aria-hidden
    >
      <div className="page-animated-bg__base" />
    </div>
  )
}
