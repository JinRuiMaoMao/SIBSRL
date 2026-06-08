/**
 * Build src/data/routesSibsTypes.ts from data/wiki-import/*.json
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** SIBS类型.txt 中尚无完整 Wiki 站序的线路 */
const REQUIRED_STUB_IDS = [
  '76S',
  '476*',
  '476#',
  '476#*',
  '476%',
  '476P',
  '476X',
  'N476',
]

const IMPORT_DIR = resolve('data/wiki-import')
const OUT = resolve('src/data/routesSibsTypes.ts')
const STUB_FILE = resolve('src/data/routesSibsTypes.ts')

const MANUAL_ORIGINS = {
  N171: {
    origin: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    destination: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
  },
  N146: {
    origin: { zh: '货柜码头岛', en: "Container's Island" },
    destination: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' },
  },
  R148: {
    origin: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' },
    destination: { zh: '白鸽公园', en: 'Dove Park' },
  },
  U47: {
    origin: { zh: '旭涛荟', en: 'Hotel Symbol' },
    destination: { zh: '阳光大学北', en: 'North Sunshine University' },
  },
  '370': {
    origin: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    destination: { zh: '仙贝广场', en: 'Senpai Shopping Centre' },
  },
  '370B': {
    origin: { zh: '仙贝广场', en: 'Senpai Shopping Centre' },
    destination: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
  },
  '475': {
    origin: { zh: '仙贝广场', en: 'Senpai Shopping Centre' },
    destination: { zh: '北顿市中心', en: 'Norton Town Center' },
    length: {
      zh: '往北顿市中心 22 km / 往仙贝广场 20.7 km',
      en: 'To Norton Town Center 22 km / To Senpai Shopping Centre 20.7 km',
    },
  },
  '476': {
    origin: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
    destination: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' },
  },
  '370': {
    origin: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    destination: { zh: '仙贝广场', en: 'Senpai Shopping Centre' },
  },
  '370B': {
    origin: { zh: '仙贝广场', en: 'Senpai Shopping Centre' },
    destination: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
  },
  C01: {
    origin: { zh: '际巴车厂', en: 'CSB Depot' },
    destination: { zh: '仙贝广场 / 际巴车厂', en: 'Senpai Shopping Center / CSB Depot' },
    length: {
      zh: '往仙贝广场 11.8 km / 往际巴车厂 11.6 km',
      en: 'To Senpai Shopping Center 11.8 km / To CSB Depot 11.6 km',
    },
  },
  C401: {
    origin: { zh: '际巴车厂', en: 'CSB Depot' },
    destination: { zh: '北顿市中心', en: 'Norton Town Center' },
  },
  C401A: {
    origin: { zh: '际巴车厂', en: 'CSB Depot' },
    destination: { zh: '北顿市中心', en: 'Norton Town Center' },
  },
  F701: {
    origin: { zh: '浅水湾车厂', en: 'FT Shallow Valley Depot' },
    destination: { zh: '北顿市中心', en: 'Norton Town Center' },
  },
  F702: {
    origin: { zh: '海西邨', en: 'Haisey Estate' },
    destination: { zh: '浅水湾车厂', en: 'FT Shallow Valley Depot' },
  },
  '475P': {
    origin: { zh: '海西邨', en: 'Haisey Estate' },
    destination: { zh: '中日街', en: 'Sun Central Street' },
  },
  N472: {
    origin: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
    destination: { zh: '北顿市中心', en: 'Norton Town Center' },
  },
  N476: {
    origin: { zh: '北顿市中心', en: 'Norton Town Center' },
    destination: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
  },
  '160R': {
    origin: { zh: '阳光体育馆', en: 'Sunshine Stadium' },
    destination: { zh: '第七区转车站', en: 'Zone 7 Interchange' },
  },
  '170R': {
    origin: { zh: '阳光体育馆', en: 'Sunshine Stadium' },
    destination: { zh: '彩虹中心', en: 'Rainbow Estate Complex' },
  },
  '171R': {
    origin: { zh: '阳光体育馆', en: 'Sunshine Stadium' },
    destination: { zh: '叶欣海旁道', en: 'Praya YiYan Road' },
  },
  S1: {
    origin: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    destination: { zh: '中环（中日街）', en: 'Sun Central Street' },
  },
  S2: {
    origin: { zh: '长岛码头', en: 'Long Island Ferry Pier' },
    destination: { zh: '中环（中日街）', en: 'Sun Central Street' },
  },
}

/** Wiki 编号 → 游戏内编号（SIBS 类型.txt） */
const IN_GAME_ROUTE_NUMBERS = {
  S1: 'S1A',
  S2: 'S2A',
}

function cleanEn(en) {
  if (!en) return en
  return en.split('|')[0].trim()
}

function applyPlaceZh(obj) {
  if (!obj?.zh || !obj?.en) return obj
  if (/[\u4e00-\u9fff]/.test(obj.zh) && !/^[A-Za-z0-9#*]+$/.test(obj.zh.trim())) return obj
  const map = {
    'norton town center': '北顿市中心',
    "container's island": '货柜码头岛',
    'long island ferry pier': '长岛码头',
    'rainbow estate complex': '彩虹中心',
    'senpai shopping center': '仙贝广场',
    'senpai shopping centre': '仙贝广场',
    'haisey estate': '海西邨',
    'csb depot': '际巴车厂',
    'eastmallow praya road': '东锦葵海傍路',
    'hotel symbol': '旭涛荟',
    'sunshine stadium': '阳光体育馆',
    'ft shallow valley depot': '浅水湾车厂',
  }
  const key = obj.en.toLowerCase().replace(/['’]/g, '').trim()
  const zh = map[key] ?? obj.zh
  return { zh, en: obj.en }
}

function cleanRoute(route) {
  const r = structuredClone(route)
  const manual = MANUAL_ORIGINS[r.id]
  if (manual) {
    r.origin = manual.origin
    r.destination = manual.destination
    if (manual.length) r.length = manual.length
  } else {
    r.origin = applyPlaceZh(r.origin)
    r.destination = applyPlaceZh(r.destination)
  }
  if (r.stops) {
    for (const d of r.stops) {
      for (const s of d.list) {
        if (s.name?.en) s.name.en = cleanEn(s.name.en)
      }
      if (d.direction?.en) d.direction.en = d.direction.en.replace(/\|/g, ' ')
    }
  }
  if (r.via?.en) r.via.en = r.via.en.replace(/\[\[/g, '').replace(/\]\]/g, '')
  if (r.via?.zh) r.via.zh = r.via.zh.replace(/\[\[/g, '').replace(/\]\]/g, '')
  return r
}

function isGoodRoute(route) {
  if (!route.stops?.length) return false
  const total = route.stops.reduce((n, d) => n + d.list.length, 0)
  if (total < 3) return false
  const bad = route.stops.some((d) =>
    d.list.some(
      (s) =>
        /rowspan/i.test(s.name.en) ||
        /^Zone\s*\d+\s*$/i.test(s.name.en) ||
        /^Zone\s*\d+\s*\(/i.test(s.name.en),
    ),
  )
  return !bad
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function bilingual(obj, indent) {
  if (!obj) return ''
  return `${indent}{ zh: '${esc(obj.zh)}', en: '${esc(obj.en)}' }`
}

function emitRoute(route, indent = '  ') {
  const lines = []
  lines.push(`${indent}{`)
  lines.push(`${indent}  id: '${esc(route.id)}',`)
  lines.push(`${indent}  number: '${esc(route.number)}',`)
  lines.push(`${indent}  operators: [${route.operators.map((o) => `'${o}'`).join(', ')}],`)
  lines.push(`${indent}  category: '${route.category}',`)
  lines.push(`${indent}  pattern: '${route.pattern}',`)
  lines.push(`${indent}  zones: [${route.zones.join(', ')}],`)
  lines.push(`${indent}  origin: ${bilingual(route.origin, indent + '  ')},`)
  lines.push(`${indent}  destination: ${bilingual(route.destination, indent + '  ')},`)
  if (route.via) lines.push(`${indent}  via: ${bilingual(route.via, indent + '  ')},`)
  if (route.serviceTime && !route.stops?.length)
    lines.push(`${indent}  serviceTime: ${bilingual(route.serviceTime, indent + '  ')},`)
  if (route.interval) lines.push(`${indent}  interval: ${bilingual(route.interval, indent + '  ')},`)
  if (route.journeyTime) lines.push(`${indent}  journeyTime: ${bilingual(route.journeyTime, indent + '  ')},`)
  if (route.fare) lines.push(`${indent}  fare: '${esc(route.fare)}',`)
  if (route.levelRequired != null) lines.push(`${indent}  levelRequired: ${route.levelRequired},`)
  if (route.length) {
    const len = route.length
    if (len.zh?.includes('往') && !len.zh.includes('km /')) {
      /* keep single-direction length as-is */
    }
    lines.push(`${indent}  length: ${bilingual(route.length, indent + '  ')},`)
  }
  if (route.stops?.length) {
    lines.push(`${indent}  stops: [`)
    for (const d of route.stops) {
      lines.push(`${indent}    {`)
      if (d.directionKey) lines.push(`${indent}      directionKey: '${d.directionKey}',`)
      lines.push(`${indent}      direction: ${bilingual(d.direction, indent + '      ')},`)
      if (d.serviceTime) lines.push(`${indent}      serviceTime: ${bilingual(d.serviceTime, indent + '      ')},`)
      if (d.length) lines.push(`${indent}      length: ${bilingual(d.length, indent + '      ')},`)
      lines.push(`${indent}      list: [`)
      for (const s of d.list) {
        const zone = s.zone != null ? `, zone: ${s.zone}` : ''
        lines.push(
          `${indent}        { name: ${bilingual(s.name, indent + '          ')}${zone} },`,
        )
      }
      lines.push(`${indent}      ],`)
      lines.push(`${indent}    },`)
    }
    lines.push(`${indent}  ],`)
  }
  if (route.notes) lines.push(`${indent}  notes: ${bilingual(route.notes, indent + '  ')},`)
  lines.push(`${indent}  wikiUrl: '${esc(route.wikiUrl)}',`)
  lines.push(`${indent}},`)
  return lines.join('\n')
}

const files = readdirSync(IMPORT_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
const routes = []
const skipped = []

for (const f of files) {
  const route = cleanRoute(JSON.parse(readFileSync(resolve(IMPORT_DIR, f), 'utf8')))
  if (isGoodRoute(route)) routes.push(route)
  else skipped.push(route.id)
}

for (const route of routes) {
  const inGameNumber = IN_GAME_ROUTE_NUMBERS[route.id]
  if (!inGameNumber) continue
  const wikiId = route.id
  route.id = inGameNumber
  route.number = inGameNumber
  route.wikiUrl = `https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_${encodeURIComponent(wikiId)}`
  if (wikiId === 'S1') {
    route.notes = {
      zh: '日间观光环线（Wiki 编号 S1，游戏内为 S1A）。需消耗 Sunshards 解锁。',
      en: 'Daytime sightseeing loop (Wiki route S1, in-game as S1A). Unlocked with Sunshards.',
    }
  }
  if (wikiId === 'S2') {
    route.notes = {
      zh: '晚间观光环线（Wiki 编号 S2，游戏内为 S2A）。需消耗 Sunshards 解锁。',
      en: 'Evening sightseeing loop (Wiki route S2, in-game as S2A). Unlocked with Sunshards.',
    }
  }
}

const have = new Set(routes.map((r) => r.id))
const stillMissing = REQUIRED_STUB_IDS.filter((id) => !have.has(id))

function wikiJsonPath(id) {
  return resolve(IMPORT_DIR, `${id.replace(/[%#*]/g, '_')}.json`)
}

function emitStub(id) {
  const path = wikiJsonPath(id)
  const meta = existsSync(path)
    ? cleanRoute(JSON.parse(readFileSync(path, 'utf8')))
    : {
        id,
        operators: ['FT'],
        category: 'inner',
        pattern: 'bidirectional',
        zones: [1],
        origin: { zh: id, en: id },
        destination: { zh: id, en: id },
      }
  delete meta.stops
  delete meta.wikiUrl
  const lines = [`  s('${esc(id)}', {`]
  lines.push(`    operators: [${meta.operators.map((o) => `'${o}'`).join(', ')}],`)
  lines.push(`    category: '${meta.category}',`)
  lines.push(`    pattern: '${meta.pattern}',`)
  lines.push(`    zones: [${meta.zones.join(', ')}],`)
  lines.push(`    origin: ${bilingual(meta.origin, '    ')},`)
  lines.push(`    destination: ${bilingual(meta.destination, '    ')},`)
  if (meta.via) lines.push(`    via: ${bilingual(meta.via, '    ')},`)
  if (meta.interval) lines.push(`    interval: ${bilingual(meta.interval, '    ')},`)
  if (meta.journeyTime) lines.push(`    journeyTime: ${bilingual(meta.journeyTime, '    ')},`)
  if (meta.fare) lines.push(`    fare: '${esc(meta.fare)}',`)
  if (meta.levelRequired != null) lines.push(`    levelRequired: ${meta.levelRequired},`)
  if (meta.length) lines.push(`    length: ${bilingual(meta.length, '    ')},`)
  if (meta.serviceTime) lines.push(`    serviceTime: ${bilingual(meta.serviceTime, '    ')},`)
  lines.push(`  }),`)
  return lines.join('\n') + '\n'
}

const header = `import type { BusRoute } from '../types/route'
import { wikiUrlForRouteId } from './routeServiceTypes'

/** Wiki 导入线路（scripts/import-route-from-wiki.mjs + build-sibs-routes-ts.mjs） */
function s(
  id: string,
  partial: Omit<BusRoute, 'id' | 'number' | 'wikiUrl'> & { number?: string },
): BusRoute {
  return {
    id,
    number: partial.number ?? id,
    wikiUrl: wikiUrlForRouteId(id),
    ...partial,
  }
}

`

let body = `export const routesSibsTypes: BusRoute[] = [\n${routes.map((r) => emitRoute(r)).join('\n')}\n`

if (stillMissing.length) {
  body += `  // Wiki 无完整站序，保留元数据占位\n`
  for (const id of stillMissing) {
    body += emitStub(id)
  }
}

body += `]\n`

writeFileSync(OUT, header + body)
console.log(`Wrote ${routes.length} full routes, ${stillMissing.length} stubs`)
console.log('Skipped import (low quality):', skipped.join(', '))
