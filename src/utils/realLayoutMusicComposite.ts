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

/** 4:53 — main loop ends here and jumps back to 0:49. */
const MAP_MENU_MAIN_END_AT = 4 * 60 + 53

/** Routes map music: Radium2 intro → original Radium 0:49–4:53, then loop from 0:49. */
export const REAL_LAYOUT_MUSIC_COMPOSITE: Partial<
  Record<RealLayoutMusicTrackId, RealLayoutMusicCompositeConfig>
> = {
  'music-map-menu': {
    segments: [
      { asset: 'audio/broadcasts/music/music-map-menu-intro.ogg', endAt: 30 },
      {
        asset: 'audio/broadcasts/music/music-map-menu.ogg',
        startAt: 49,
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
