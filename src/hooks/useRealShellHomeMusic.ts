import { useEffect } from 'react'
import { attemptRealLayoutAutoplay, loadRealLayoutMusicTrack } from '../utils/realLayoutMusicPlayer'
import { readRealMusicMuted, type RealLayoutMusicTrackId } from '../utils/realLayoutMusicStorage'

export type RealShellRoutesPhase = 'start' | 'opening-routes' | 'routes' | 'closing-routes'

function trackForRoutesPhase(phase: RealShellRoutesPhase): RealLayoutMusicTrackId {
  if (phase === 'start' || phase === 'closing-routes') return 'music-main-menu'
  return 'music-map-menu'
}

/** Real 开始页 ↔ 选线：点击进入选线（opening）即切 map BGM；返回（closing）即切主菜单 BGM。 */
export function useRealShellHomeMusic(routesPhase: RealShellRoutesPhase): void {
  useEffect(() => {
    loadRealLayoutMusicTrack(trackForRoutesPhase(routesPhase))
    if (!readRealMusicMuted()) void attemptRealLayoutAutoplay()
  }, [routesPhase])
}
