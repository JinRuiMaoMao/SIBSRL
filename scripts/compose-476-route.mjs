/**
 * Build data/wiki-import/476.json — main line has no Stops== on Wiki.
 * Stops composed from verified segments (171, N472, 475 imports).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = JSON.parse(readFileSync(resolve('data/wiki-import/476.json'), 'utf8'))

const n472N = JSON.parse(readFileSync(resolve('data/wiki-import/N472.json'), 'utf8')).stops[0]
  .list
const n472S = JSON.parse(readFileSync(resolve('data/wiki-import/N472.json'), 'utf8')).stops[1]
  .list
const p475N = JSON.parse(readFileSync(resolve('data/wiki-import/475.json'), 'utf8')).stops[0].list

const pick = (list, enName) => {
  const s = list.find((x) => x.name.en === enName || x.name.en.includes(enName.slice(0, 12)))
  return s ? { name: { ...s.name }, zone: s.zone } : null
}

const sliceEn = (list, fromEn, toEn) => {
  const a = list.findIndex((x) => x.name.en === fromEn)
  const b = list.findIndex((x) => x.name.en === toEn)
  if (a < 0 || b < 0) return []
  return list.slice(Math.min(a, b), Math.max(a, b) + 1).map((s) => ({
    name: { ...s.name },
    zone: s.zone,
  }))
}

/** Rainbow → East Door (N472) */
const rainbowEast = sliceEn(
  n472N,
  'Rainbow Estate Complex',
  'East Door Port Road',
).filter((s) => s.name.en !== 'Axis Road' && s.name.en !== 'Senpai Shopping Center')

/** Zone 7 → Central (N472, skip Norton leg) */
const zoneCentral = n472N
  .slice(
    n472N.findIndex((x) => x.name.en.includes('Section fare') || x.name.en === 'Sunshine Road'),
  )
  .filter((x) => !/Norton/i.test(x.name.en))
  .slice(0, 8)
  .map((s) => ({ name: { ...s.name }, zone: s.zone }))

/** Alexander / Normal Gap leg (simplified zh from routes.ts 171) */
const normalGap = [
  { name: { zh: '东门公园', en: 'East Door Park' }, zone: 7 },
  { name: { zh: '勿莫商场', en: 'Mo Shopping Center' }, zone: 7 },
  { name: { zh: '罗力素花园二期', en: 'Laws Garden 2' }, zone: 7 },
  { name: { zh: '叶欣径', en: 'Leafy Walking Trail' }, zone: 7 },
  { name: { zh: '仙贝山', en: 'Senpai Hill' }, zone: 7 },
  { name: { zh: '亚历山大教堂', en: 'Alexander Church' }, zone: 7 },
  { name: { zh: '仙贝多层停车场', en: 'Senpai Multi-Storey Carpark' }, zone: 7 },
  { name: { zh: '亚历山大花园', en: 'Alexander Garden' }, zone: 7 },
  { name: { zh: '叶欣警察局', en: 'Leafy Police Station' }, zone: 7 },
  { name: { zh: '叶角大学', en: 'Leafy University' }, zone: 7 },
]

const z7 = pick(n472N, 'Axis Road') ?? {
  name: { zh: '第七区转车站', en: 'Zone 7 Interchange' },
  zone: 7,
}
z7.name = { zh: '第七区转车站 (西行)', en: 'Zone 7 Interchange (Westbound)' }

const eastmallowLeg = [
  {
    name: { zh: '东锦葵邨－阳葵屋', en: 'Eastmallow Estate - Sunny House' },
    zone: 4,
  },
  { name: { zh: '东锦葵大街', en: 'Eastmallow Main Street' }, zone: 4 },
  { name: { zh: '阳光大学', en: 'Sunshine University' }, zone: 4 },
  { name: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' }, zone: 4 },
]

const toEast = [
  ...rainbowEast,
  ...normalGap,
  z7,
  ...zoneCentral,
  ...eastmallowLeg,
]

const toRainbow = [...toEast].reverse()

const route = {
  ...base,
  origin: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
  destination: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' },
  stops: [
    {
      directionKey: 'E',
      direction: {
        zh: '东行（彩虹中心 → 东锦葵海傍路）',
        en: 'Eastbound (Rainbow Estate Complex → Eastmallow Praya Road)',
      },
      serviceTime: { zh: '05:30 – 00:10', en: '05:30 – 00:10' },
      list: toEast,
    },
    {
      directionKey: 'W',
      direction: {
        zh: '西行（东锦葵海傍路 → 彩虹中心）',
        en: 'Westbound (Eastmallow Praya Road → Rainbow Estate Complex)',
      },
      serviceTime: { zh: '05:55 – 23:55', en: '05:55 – 23:55' },
      list: toRainbow,
    },
  ],
}

writeFileSync(resolve('data/wiki-import/476.json'), JSON.stringify(route, null, 2))
console.log('Wrote 476 with', toEast.length, 'stops per direction')
