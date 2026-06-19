import { useRef, type RefObject } from 'react'
import { SearchSyntaxHelp } from './SearchSyntaxHelp'

interface RouteSearchSyntaxDockProps {
  panelRef: RefObject<HTMLDivElement | null>
  stickyRef: RefObject<HTMLElement | null>
  visible: boolean
}

export function RouteSearchSyntaxDock({
  panelRef,
  stickyRef,
  visible,
}: RouteSearchSyntaxDockProps) {
  return (
    <div
      ref={panelRef}
      className={`route-syntax-dock${visible ? '' : ' is-collapsed'}`}
    >
      <SearchSyntaxHelp stickyRef={stickyRef} visible={visible} />
    </div>
  )
}
