import type { AnimationEvent, ReactNode } from 'react'

export function RealStartOverlayShell({
  title,
  onClose,
  onAnimationEnd,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="real-start-overlay-page sibs-scrollbar">
      <div className="real-start-overlay-panel" onAnimationEnd={onAnimationEnd}>
        <div className="real-start-overlay-shell">
          <header className="real-start-overlay-header">
            <button type="button" className="real-start-overlay-back" onClick={onClose}>
              <span className="real-start-overlay-back-chevron" aria-hidden="true">
                ‹
              </span>
              <span>{title}</span>
            </button>
          </header>
          <main className="real-start-overlay-main">{children}</main>
          {footer ? <footer className="real-start-overlay-footer">{footer}</footer> : null}
        </div>
      </div>
    </div>
  )
}
