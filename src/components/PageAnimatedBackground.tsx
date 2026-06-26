import { useAppPreferences } from '../contexts/AppPreferencesContext'

/** Full-viewport animated gradient backdrop (theme accent orbs + base gradient). */
export function PageAnimatedBackground() {
  const { reduceMotion } = useAppPreferences()

  return (
    <div
      className={`page-animated-bg${reduceMotion ? ' is-static' : ''}`}
      aria-hidden
    >
      <div className="page-animated-bg__base" />
      <div className="page-animated-bg__orb page-animated-bg__orb--1" />
      <div className="page-animated-bg__orb page-animated-bg__orb--2" />
      <div className="page-animated-bg__orb page-animated-bg__orb--3" />
    </div>
  )
}
