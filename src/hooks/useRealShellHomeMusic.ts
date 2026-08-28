import { useEffect } from 'react'
import { attemptRealLayoutAutoplay, loadRealLayoutMusicTrack } from '../utils/realLayoutMusicPlayer'
import { readRealMusicMuted, type RealLayoutMusicTrackId } from '../utils/realLayoutMusicStorage'

export type RealShellRoutesPhase = 'start' | 'opening-routes' | 'routes' | 'closing-routes'

function trackForRoutesPhase(phase: RealShellRoutesPhase): RealLayoutMusicTrackId {
  return phase === 'routes' ? 'music-map-menu' : 'music-main-menu'
}

/** Real 开始页 ↔ 选线：仅在稳定页或返回过渡时切 BGM，避免动画中途切轨错乱。 */
export function useRealShellHomeMusic(routesPhase: RealShellRoutesPhase): void {
  useEffect(() => {
    loadRealLayoutMusicTrack(trackForRoutesPhase(routesPhase))
    if (!readRealMusicMuted()) void attemptRealLayoutAutoplay()
  }, [routesPhase])
}
