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
/** First entry into Radium after intro (3:09). */
export const MAP_MENU_MAIN_ENTRY_START_AT = 3 * 60 + 9
/** Radium loop body starts here (0:17) after the first pass. */
export const MAP_MENU_MAIN_LOOP_START_AT = 17
/** Radium begins fading at 4:52.45, then loops from MAP_MENU_MAIN_LOOP_START_AT. */
export const MAP_MENU_MAIN_FADE_AT = 4 * 60 + 52 + 0.45

const MAP_MENU_MAIN_ASSET = 'audio/broadcasts/music/music-map-menu.ogg'

/** Routes: intro → Radium 3:09–4:52.45 once, then 0:17–4:52.45 loop. */
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
        asset: MAP_MENU_MAIN_ASSET,
        startAt: MAP_MENU_MAIN_ENTRY_START_AT,
        endAt: MAP_MENU_MAIN_FADE_AT,
      },
      {
        asset: MAP_MENU_MAIN_ASSET,
        startAt: MAP_MENU_MAIN_LOOP_START_AT,
        endAt: MAP_MENU_MAIN_FADE_AT,
      },
    ],
    loop: true,
    loopFromSegmentIndex: 2,
  },
}

export function getRealLayoutMusicCompositeConfig(
  trackId: RealLayoutMusicTrackId,
): RealLayoutMusicCompositeConfig | null {
  return REAL_LAYOUT_MUSIC_COMPOSITE[trackId] ?? null
}
