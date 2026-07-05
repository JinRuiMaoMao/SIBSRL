import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(fileURLToPath(import.meta.url), '..', '..')
const srcDir = 'E:/SIBS资源/音乐/1.7--1.8'
const destDir = path.join(root, 'audio/broadcasts/music/legacy-1.7-1.8')

const tracks = [
  {
    src: 'Lucky★Star BGM Lucky Channel Theme.mp3',
    dest: 'legacy-lucky-star-lucky-channel-theme.mp3',
  },
  {
    src: "Phoenix Wright Cadenza 04 - Turnabout Sisters' Theme.mp3",
    dest: 'legacy-turnabout-sisters-theme.mp3',
  },
  {
    src: 'Ring Attack - Mario Golf Toadstool Tour Music Extended.mp3',
    dest: 'legacy-ring-attack-mario-golf.mp3',
  },
  {
    src: 'Sonic Colors Aquarium Park Act 2 Music.mp3',
    dest: 'legacy-sonic-colors-aquarium-park.mp3',
  },
  {
    src: 'Virtual Riot - Earth & Sky.mp3',
    dest: 'legacy-virtual-riot-earth-sky.mp3',
  },
  {
    src: 'Wii Shopping Channel Remix - Nicky Flowers.mp3',
    dest: 'legacy-wii-shopping-channel-remix.mp3',
  },
  {
    src: '彩花 Ayaka x Versiple - keep on shining xoxo.mp3',
    dest: 'legacy-keep-on-shining-xoxo.mp3',
  },
]

fs.mkdirSync(destDir, { recursive: true })

for (const track of tracks) {
  const from = path.join(srcDir, track.src)
  const to = path.join(destDir, track.dest)
  if (!fs.existsSync(from)) {
    throw new Error(`Missing source file: ${track.src}`)
  }
  fs.copyFileSync(from, to)
  console.log(`copied ${track.dest}`)
}
