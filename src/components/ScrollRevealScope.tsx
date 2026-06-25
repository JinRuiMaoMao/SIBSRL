import { useRef, type ReactNode } from 'react'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import { useScrollReveal } from '../hooks/useScrollReveal'

interface ScrollRevealScopeProps {
  children: ReactNode
  className?: string
}

export function ScrollRevealScope({ children, className }: ScrollRevealScopeProps) {
  const rootRef = useRef<HTMLElement>(null)
  const { reduceMotion } = useAppPreferences()

  useScrollReveal(rootRef, reduceMotion)

  return (
    <main ref={rootRef} className={className}>
      {children}
    </main>
  )
}
