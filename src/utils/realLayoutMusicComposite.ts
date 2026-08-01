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

const MAP_MENU_SPLICE_AT = 17

/** Routes map music: Radium2 → original Radium, both spliced at 0:17; main loops from 0:17. */
export const REAL_LAYOUT_MUSIC_COMPOSITE: Partial<
  Record<RealLayoutMusicTrackId, RealLayoutMusicCompositeConfig>
> = {
  'music-map-menu': {
    segments: [
      { asset: 'audio/broadcasts/music/music-map-menu-intro.ogg', endAt: MAP_MENU_SPLICE_AT },
      { asset: 'audio/broadcasts/music/music-map-menu.ogg', startAt: MAP_MENU_SPLICE_AT },
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
