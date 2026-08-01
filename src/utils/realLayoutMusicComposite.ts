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
}

/** Radium2 intro begins fading at 0:30. */
export const MAP_MENU_INTRO_FADE_AT = 30
/** Original Radium loop body starts here (0:30). */
export const MAP_MENU_MAIN_START_AT = 30
/** Original Radium begins fading at 4:53, then loops from MAP_MENU_MAIN_START_AT. */
export const MAP_MENU_MAIN_FADE_AT = 4 * 60 + 53

/** Routes map music: Radium2 intro → Radium 0:30–4:53, loop from 0:30. */
export const REAL_LAYOUT_MUSIC_COMPOSITE: Partial<
  Record<RealLayoutMusicTrackId, RealLayoutMusicCompositeConfig>
> = {
  'music-map-menu': {
    segments: [
      {
        asset: 'audio/broadcasts/music/music-map-menu-intro.ogg',
        endAt: MAP_MENU_INTRO_FADE_AT,
      },
      {
        asset: 'audio/broadcasts/music/music-map-menu.ogg',
        startAt: MAP_MENU_MAIN_START_AT,
        endAt: MAP_MENU_MAIN_FADE_AT,
      },
    ],
    loop: true,
    loopFromSegmentIndex: 1,
  },
}

export function getRealLayoutMusicCompositeConfig(
  trackId: RealLayoutMusicTrackId,
): RealLayoutMusicCompositeConfig | null {
  return REAL_LAYOUT_MUSIC_COMPOSITE[trackId] ?? null
}
