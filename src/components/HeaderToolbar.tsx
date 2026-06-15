import type { RefObject } from 'react'
import { SettingsMenu } from './SettingsMenu'

interface HeaderToolbarProps {
  toolbarRef?: RefObject<HTMLDivElement | null>
}

export function HeaderToolbar({ toolbarRef }: HeaderToolbarProps) {
  return (
    <div className="header-toolbar" ref={toolbarRef}>
      <SettingsMenu />
    </div>
  )
}
