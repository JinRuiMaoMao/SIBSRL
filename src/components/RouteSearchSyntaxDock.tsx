import { useRef, type RefObject } from 'react'
import { useSearchSyntaxScrollHide } from '../hooks/useSearchSyntaxScrollHide'
import { SearchSyntaxHelp } from './SearchSyntaxHelp'

interface RouteSearchSyntaxDockProps {
  stickyRef: RefObject<HTMLElement | null>
}

export function RouteSearchSyntaxDock({ stickyRef }: RouteSearchSyntaxDockProps) {
  const dockRef = useRef<HTMLDivElement>(null)
  const hidden = useSearchSyntaxScrollHide(stickyRef, dockRef)

  return (
    <div
      ref={dockRef}
      className={`route-syntax-dock${hidden ? ' is-hidden' : ''}`}
    >
      <SearchSyntaxHelp stickyRef={stickyRef} visible={!hidden} />
    </div>
  )
}
