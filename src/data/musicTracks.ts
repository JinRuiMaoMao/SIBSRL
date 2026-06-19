import type { BilingualText } from '../types/route'

export interface MusicTrack {
  id: string
  number: number
  title: BilingualText
  /** Roblox 音频资产 ID（游戏内） */
  robloxAssetId?: string
  audioUrl: string
  /** 播放结束后自动循环（结算音乐除外） */
  loop: boolean
}

export const musicTracks: MusicTrack[] = [
  {
    id: 'music-main-menu',
    number: 1,
    title: { zh: 'San Francisco Nights', en: 'San Francisco Nights' },
    robloxAssetId: '1844594737',
    audioUrl: './audio/broadcasts/music/music-main-menu.ogg',
    loop: true,
  },
  {
    id: 'music-map-menu',
    number: 2,
    title: { zh: 'Radium', en: 'Radium' },
    robloxAssetId: '1837646460',
    audioUrl: './audio/broadcasts/music/music-map-menu.ogg',
    loop: true,
  },
  {
    id: 'music-spawn-01',
    number: 3,
    title: { zh: 'Shiawase', en: 'Shiawase' },
    robloxAssetId: '5409360995',
    audioUrl: './audio/broadcasts/music/music-spawn-01.ogg',
    loop: true,
  },
  {
    id: 'music-spawn-02',
    number: 4,
    title: { zh: 'Daily Rush', en: 'Daily Rush' },
    robloxAssetId: '1846560262',
    audioUrl: './audio/broadcasts/music/music-spawn-02.ogg',
    loop: true,
  },
  {
    id: 'music-spawn-03',
    number: 5,
    title: { zh: 'Meltdown', en: 'Meltdown' },
    robloxAssetId: '1845092181',
    audioUrl: './audio/broadcasts/music/music-spawn-03.ogg',
    loop: true,
  },
  {
    id: 'music-spawn-04',
    number: 6,
    title: { zh: 'Night Run', en: 'Night Run' },
    robloxAssetId: '9040101258',
    audioUrl: './audio/broadcasts/music/music-spawn-04.ogg',
    loop: true,
  },
  {
    id: 'music-settlement-01',
    number: 7,
    title: { zh: '结算 1', en: 'Settlement 1' },
    audioUrl: './audio/broadcasts/music/music-settlement-01.ogg',
    loop: false,
  },
  {
    id: 'music-settlement-02',
    number: 8,
    title: { zh: '结算 2', en: 'Settlement 2' },
    audioUrl: './audio/broadcasts/music/music-settlement-02.ogg',
    loop: false,
  },
  {
    id: 'music-settlement-03',
    number: 9,
    title: { zh: '结算 3', en: 'Settlement 3' },
    audioUrl: './audio/broadcasts/music/music-settlement-03.ogg',
    loop: false,
  },
  {
    id: 'music-settlement-after',
    number: 10,
    title: { zh: '结算后', en: 'After Settlement' },
    audioUrl: './audio/broadcasts/music/music-settlement-after.ogg',
    loop: false,
  },
]
