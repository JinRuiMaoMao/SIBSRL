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

/** Radium2 intro fades out at 0:30. */
export const MAP_MENU_INTRO_END_AT = 30
/** Original Radium loop body starts here (3:09). */
export const MAP_MENU_MAIN_START_AT = 3 * 60 + 9
/** Original Radium loop body ends here (4:53), then returns to MAP_MENU_MAIN_START_AT. */
export const MAP_MENU_MAIN_END_AT = 4 * 60 + 53

/** Routes map music: Radium2 intro → Radium 3:09–4:53, loop from 3:09. */
export const REAL_LAYOUT_MUSIC_COMPOSITE: Partial<
  Record<RealLayoutMusicTrackId, RealLayoutMusicCompositeConfig>
> = {
  'music-map-menu': {
    segments: [
      {
        asset: 'audio/broadcasts/music/music-map-menu-intro.ogg',
        endAt: MAP_MENU_INTRO_END_AT,
      },
      {
        asset: 'audio/broadcasts/music/music-map-menu.ogg',
        startAt: MAP_MENU_MAIN_START_AT,
        endAt: MAP_MENU_MAIN_END_AT,
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
