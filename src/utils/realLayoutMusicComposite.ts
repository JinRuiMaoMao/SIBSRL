import type { RealLayoutMusicTrackId } from './realLayoutMusicStorage'

export type RealLayoutMusicCompositeSegment = {
  asset: string
  startAt?: number
  endAt?: number
}

export type RealLayoutMusicCompositeConfig = {
  segments: RealLayoutMusicCompositeSegment[]
  loop: boolean
}

/** Routes map music: Radium2 intro → original Radium from 0:49. */
export const REAL_LAYOUT_MUSIC_COMPOSITE: Partial<
  Record<RealLayoutMusicTrackId, RealLayoutMusicCompositeConfig>
> = {
  'music-map-menu': {
    segments: [
      { asset: 'audio/broadcasts/music/music-map-menu-intro.ogg', endAt: 30 },
      { asset: 'audio/broadcasts/music/music-map-menu.ogg', startAt: 49 },
    ],
    loop: true,
  },
}

export function getRealLayoutMusicCompositeConfig(
  trackId: RealLayoutMusicTrackId,
): RealLayoutMusicCompositeConfig | null {
  return REAL_LAYOUT_MUSIC_COMPOSITE[trackId] ?? null
}
