import type { BilingualText } from '../types/route'

export interface MusicTrack {
  id: string
  number: number
  title: BilingualText
  audioUrl: string
  /** 播放结束后自动循环（结算音乐除外） */
  loop: boolean
}

export const musicTracks: MusicTrack[] = [
  {
    id: 'music-main-menu',
    number: 1,
    title: { zh: '主界面', en: 'Main Menu' },
    audioUrl: './audio/broadcasts/music/music-main-menu.ogg',
    loop: true,
  },
  {
    id: 'music-map-menu',
    number: 2,
    title: { zh: '地图界面', en: 'Map Menu' },
    audioUrl: './audio/broadcasts/music/music-map-menu.ogg',
    loop: true,
  },
  {
    id: 'music-spawn-01',
    number: 3,
    title: { zh: '车辆生成 1', en: 'Vehicle Spawn 1' },
    audioUrl: './audio/broadcasts/music/music-spawn-01.ogg',
    loop: true,
  },
  {
    id: 'music-spawn-02',
    number: 4,
    title: { zh: '车辆生成 2', en: 'Vehicle Spawn 2' },
    audioUrl: './audio/broadcasts/music/music-spawn-02.ogg',
    loop: true,
  },
  {
    id: 'music-spawn-03',
    number: 5,
    title: { zh: '车辆生成 3', en: 'Vehicle Spawn 3' },
    audioUrl: './audio/broadcasts/music/music-spawn-03.ogg',
    loop: true,
  },
  {
    id: 'music-settlement-01',
    number: 6,
    title: { zh: '结算 1', en: 'Settlement 1' },
    audioUrl: './audio/broadcasts/music/music-settlement-01.ogg',
    loop: false,
  },
  {
    id: 'music-settlement-02',
    number: 7,
    title: { zh: '结算 2', en: 'Settlement 2' },
    audioUrl: './audio/broadcasts/music/music-settlement-02.ogg',
    loop: false,
  },
  {
    id: 'music-settlement-03',
    number: 8,
    title: { zh: '结算 3', en: 'Settlement 3' },
    audioUrl: './audio/broadcasts/music/music-settlement-03.ogg',
    loop: false,
  },
]
