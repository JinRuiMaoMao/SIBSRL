export type RealLayoutMusicTrackId = 'music-main-menu' | 'music-map-menu'

const MUTED_KEY = 'sibs-real-music-muted'

export function readRealMusicMuted(): boolean {
  try {
    return sessionStorage.getItem(MUTED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeRealMusicMuted(muted: boolean): void {
  try {
    sessionStorage.setItem(MUTED_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
}
