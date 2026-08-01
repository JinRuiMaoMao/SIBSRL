import type { RefObject } from 'react'
import { isRealLayoutMode } from '../utils/appLayoutMode'
import { AccountAvatarButton } from './AccountAvatarButton'
import { RouteLayoutToggleButton } from './RouteLayoutToggleButton'
import { SettingsMenu } from './SettingsMenu'

interface HeaderToolbarProps {
  toolbarRef?: RefObject<HTMLDivElement | null>
}

export function HeaderToolbar({ toolbarRef }: HeaderToolbarProps) {
  const realLayout = isRealLayoutMode()

  return (
    <div className="header-toolbar" ref={toolbarRef}>
      {realLayout ? <RouteLayoutToggleButton className="route-layout-toggle-btn--header" /> : null}
      <AccountAvatarButton />
      <SettingsMenu />
    </div>
  )
}
