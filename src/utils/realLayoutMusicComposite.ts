import type { RealLayoutMusicTrackId } from './realLayoutMusicStorage'

export type RealLayoutMusicCompositeSegment = {
  asset: string
  startAt?: number
  endAt?: number
}

export type RealLayoutMusicCompositeConfig = {
  segments: RealLayoutMusicCompositeSegment[]
  loop: boolean
  /** Segment index to restart from when the sequence completes (default 0). */
  loopFromSegmentIndex?: number
  /** Hard-cut to the next segment at end (no volume crossfade). */
  instantSegmentHandoff?: boolean
}

const MAP_MENU_INTRO_ASSET = 'audio/broadcasts/music/music-map-menu-intro.ogg'
const MAP_MENU_BRIDGE_ASSET = 'audio/broadcasts/music/music-map-menu-bridge.ogg'
const MAP_MENU_LOOP_ASSET = 'audio/broadcasts/music/music-map-menu-loop.ogg'

/** Intro begins fading at 0:30 and crossfades into the bridge segment. */
export const MAP_MENU_INTRO_FADE_AT = 30

/** Routes map menu: intro (fade at 30s) → bridge (104s) → loop (276s). */
export const REAL_LAYOUT_MUSIC_COMPOSITE: Partial<
  Record<RealLayoutMusicTrackId, RealLayoutMusicCompositeConfig>
> = {
  'music-map-menu': {
    segments: [
      { asset: MAP_MENU_INTRO_ASSET, endAt: MAP_MENU_INTRO_FADE_AT },
      { asset: MAP_MENU_BRIDGE_ASSET },
      { asset: MAP_MENU_LOOP_ASSET },
    ],
    loop: true,
    loopFromSegmentIndex: 2,
    instantSegmentHandoff: true,
  },
}

export function getRealLayoutMusicCompositeConfig(
  trackId: RealLayoutMusicTrackId,
): RealLayoutMusicCompositeConfig | null {
  return REAL_LAYOUT_MUSIC_COMPOSITE[trackId] ?? null
}
