import type { RefObject } from 'react'
import { SettingsMenu } from './SettingsMenu'
import { ThemeToggle } from './ThemeToggle'

interface HeaderToolbarProps {
  toolbarRef?: RefObject<HTMLDivElement | null>
}

export function HeaderToolbar({ toolbarRef }: HeaderToolbarProps) {
  return (
    <div className="header-toolbar" ref={toolbarRef}>
      <ThemeToggle />
      <SettingsMenu />
    </div>
  )
}
