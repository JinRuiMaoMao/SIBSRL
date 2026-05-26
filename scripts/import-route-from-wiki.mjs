/**
 * Fetch & parse SIBS route pages from Fandom Wiki.
 * Usage: node scripts/import-route-from-wiki.mjs 476 N472 75P
 *        node scripts/import-route-from-wiki.mjs --all-stubs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const WIKI = 'https://sunshine-islands-roblox.fandom.com/api.php'
const OUT_DIR = resolve('data/wiki-import')
const STUBS_FILE = resolve('src/data/routesSibsTypes.ts')

const OPERATOR_MAP = {
  FT: 'FT',
  CSB: 'CSB',
  HZ: 'HZ',
  HG: 'HZ',
  REBC: 'REBC',
  FTCC: 'FTCC',
  TGB: 'TGB',
  LBT: 'LBT',
}

const EXTRA_STUB_IDS = ['N171', 'N146', 'R148', '475']

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function stripWiki(s) {
  return s
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/\}\}\s*Category:[\s\S]*$/i, '')
    .replace(/Category:[\s\S]*$/i, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/''+/g, '')
    .trim()
}

function pickField(wt, keys) {
  for (const key of keys) {
    const re = new RegExp(`${key}\\s*=\\s*([^\\n|]+)`, 'i')
    const m = wt.match(re)
    if (m) return stripWiki(m[1])
  }
  return ''
}

function parseOperators(raw) {
  const ops = new Set()
  for (const m of raw.matchAll(/\{\{(\w+)\}\}/g)) {
    const o = OPERATOR_MAP[m[1]]
    if (o) ops.add(o)
  }
  for (const name of Object.keys(OPERATOR_MAP)) {
    if (raw.includes(name) && (raw.includes('{{') || raw.includes(name + ' '))) {
      ops.add(OPERATOR_MAP[name])
    }
  }
  if (raw.includes('Forever Transit')) ops.add('FT')
  if (raw.includes('Cityscape Bus')) ops.add('CSB')
  if (raw.includes('Horizon Group')) ops.add('HZ')
  if (raw.includes('Roblox Express')) ops.add('REBC')
  return [...ops]
}

function parseZones(wt, stops) {
  const zones = new Set()
  const zt = wt.match(/Zone\s*(\d+)/gi) ?? []
  for (const z of zt) zones.add(Number(z.replace(/\D/g, '')))
  for (const s of stops) {
    if (s.zone) zones.add(s.zone)
  }
  return [...zones].filter((z) => z >= 1 && z <= 8).sort((a, b) => a - b)
}

function parseZoneFromPlace(place) {
  const m = place.match(/Zone\s*(\d+)/i)
  return m ? Number(m[1]) : undefined
}

function isValidStop(en, zh) {
  if (/rowspan/i.test(en) || /rowspan/i.test(zh)) return false
  if (/^Zone\s*\d/i.test(en) || /^Zone\s*\d/i.test(zh)) return false
  if ((en?.length ?? 0) < 2 && (zh?.length ?? 0) < 1) return false
  if (/^Near |^Only for|^Weekdays|^Weekends/i.test(en)) return false
  if (/^Departs at|^Timing Point|^Located at|^Refer to/i.test(en)) return false
  if (/Category:|^\d+[A-Z#*]*\}\}/i.test(en) || /Category:|^\d+[A-Z#*]*\}\}/i.test(zh)) return false
  if (en.length > 80 || zh.length > 40) return false
  return true
}

function trimStopBlock(block) {
  const cutoffs = [
    block.indexOf('\n|}'),
    block.indexOf('</gallery>'),
    block.indexOf('\n=='),
    block.indexOf('\nCategory:'),
    block.indexOf('\nFile:'),
  ].filter((i) => i > 0)
  const end = cutoffs.length ? Math.min(...cutoffs) : block.length
  return block.slice(0, end)
}

function parseWikitableRows(block) {
  const rows = []
  let buf = ''
  let inRow = false
  for (const line of block.split('\n')) {
    const t = line.trim()
    if (t.startsWith('|-')) {
      if (buf) rows.push(buf)
      buf = ''
      inRow = true
      continue
    }
    if (!inRow || t.startsWith('!') || t === '|}' || t.startsWith('{|')) continue
    if (t.startsWith('|') || buf) {
      buf += (buf ? ' ' : '') + t
    }
  }
  if (buf) rows.push(buf)
  return rows
}

function splitWikiRowCells(flat) {
  const cells = []
  let cur = ''
  let linkDepth = 0
  for (let i = 0; i < flat.length; i++) {
    const ch = flat[i]
    if (ch === '[' && flat[i + 1] === '[') {
      linkDepth++
      cur += '[['
      i++
      continue
    }
    if (ch === ']' && flat[i + 1] === ']') {
      linkDepth = Math.max(0, linkDepth - 1)
      cur += ']]'
      i++
      continue
    }
    if (ch === '|' && linkDepth === 0) {
      const t = stripWiki(cur.trim())
      if (t && t !== '-') cells.push(t)
      cur = ''
      continue
    }
    cur += ch
  }
  const t = stripWiki(cur.trim())
  if (t && t !== '-') cells.push(t)
  return cells
}

function parseCellsFromRow(rowText) {
  const flat = rowText.replace(/\s+/g, ' ').trim()
  return splitWikiRowCells(flat)
}

function parseStopFromCells(cells) {
  let zone
  const data = (/^\d+$/.test(cells[0] ?? '') ? cells.slice(1) : cells).filter(
    (c) => c && !/rowspan/i.test(c) && !/^(No|Place|Street|Note)$/i.test(c),
  )
  for (const c of data) {
    if (/^Zone\s*\d/i.test(c)) zone = parseZoneFromPlace(c)
  }
  const useful = data.filter((c) => !/^Zone\s*\d/i.test(c))
  const last = useful[useful.length - 1] ?? ''
  const prev = useful[useful.length - 2] ?? ''
  let zh = ''
  let en = ''
  if (/[\u4e00-\u9fff]/.test(last) && /[A-Za-z]/.test(prev)) {
    zh = last
    en = prev
  } else {
    for (const c of useful) {
      if (/[\u4e00-\u9fff]/.test(c) && c.length <= 24) zh = c
      else if (/[A-Za-z]/.test(c) && c.length > 2) en = c
    }
  }
  en = stripWiki(en)
  if (!en && zh) en = zh
  if (!zh && en) zh = en
  if (!isValidStop(en, zh)) return null
  return { name: { zh, en }, zone }
}

function parseWikitableBlock(block) {
  const stops = []
  const rows = parseWikitableRows(block)
  for (const row of rows) {
    const cells = parseCellsFromRow(row)
    if (cells.length < 2) continue
    if (cells[0] === 'No' || /^Place$/i.test(cells[0])) continue
    if (!/^#?\d/.test(cells[0])) continue
    const stop = parseStopFromCells(cells)
    if (stop) stops.push(stop)
  }
  return stops
}

function parseRoutemapBlock(block) {
  const stops = []
  const re =
    /\|\s*(\d+)\s*\|([\s\S]*?)\|\s*\[\[([^\]]+)\]\]\s*\|\|\s*([^|\n]+?)\s*\|/g
  let m
  while ((m = re.exec(block))) {
    const en = stripWiki(m[3])
    const zh = stripWiki(m[4])
    const zoneM = m[2].match(/Zone\s*(\d+)/i)
    const zone = zoneM ? Number(zoneM[1]) : undefined
    if (isValidStop(en, zh)) stops.push({ name: { zh: zh || en, en: en || zh }, zone })
  }
  return stops
}

function parseStopTables(wt) {
  const directions = []
  const stopsIdx = wt.indexOf('Stops==')
  if (stopsIdx < 0) return directions

  const tail = wt.slice(stopsIdx)
  const sectionRe =
    /===\s*(?:To\s+([^=]+?)|((?:North|South|East|West)bound[^=]*))\s*===([\s\S]*?)(?====|$)/gi
  let m
  while ((m = sectionRe.exec(tail))) {
    const destHint = stripWiki(m[1] || m[2] || '')
    const block = trimStopBlock(m[3])
    const headerMatch = block.match(/Bus Route[^|]*\(([^→]+?)→\s*([^)]+)\)/i)
    const enFrom = stripWiki(headerMatch?.[1] ?? '')
    const enTo = stripWiki(headerMatch?.[2] ?? '')

    let stops = parseWikitableBlock(block)
    if (!stops.length) stops = parseRoutemapBlock(block)

    if (stops.length) {
      directions.push({ destHint, enFrom, enTo, stops })
    }
  }
  if (!directions.length) {
    const end = tail.search(/\n==[^=]/)
    const block = trimStopBlock(end > 0 ? tail.slice(0, end) : tail)
    const headerMatch = block.match(/Bus Route[^|]*\(([^→]+?)→\s*([^)]+)\)/i)
    let stops = parseWikitableBlock(block)
    if (!stops.length) stops = parseRoutemapBlock(block)
    if (stops.length) {
      directions.push({
        destHint: '',
        enFrom: stripWiki(headerMatch?.[1] ?? ''),
        enTo: stripWiki(headerMatch?.[2] ?? ''),
        stops,
      })
    }
  }
  return directions
}

function parseBilingualEndpoints(raw) {
  const cleaned = stripWiki(raw)
  const parts = cleaned.split(/<br\s*\/?>/i).map((p) => stripWiki(p))
  const enLine = parts.find((p) => /[A-Za-z]{3,}/.test(p) && !/[\u4e00-\u9fff]/.test(p)) ?? parts[0] ?? ''
  const zhLine =
    parts.find((p) => /[\u4e00-\u9fff]/.test(p)) ?? parts.find((p) => p !== enLine) ?? ''

  const splitEnds = (line) => {
    if (line.includes('↔')) return line.split('↔').map((s) => s.trim())
    if (line.includes('→')) return line.split('→').map((s) => s.trim())
    return [line, line]
  }

  const [enA, enB] = splitEnds(enLine)
  const [zhA, zhB] = splitEnds(zhLine)
  return {
    origin: { zh: zhA || enA, en: enA || zhA },
    destination: { zh: zhB || enB || zhA, en: enB || enA || zhA },
    enA: enA || zhA,
    enB: enB || zhB || enA,
  }
}

function serviceTimeForDirection(stops, enA, enB, startTime, endTime) {
  const first = (stops[0]?.name.en ?? stops[0]?.name.zh ?? '').toLowerCase()
  const norm = (s) => s.replace(/\s*-\s*/g, ' – ').replace(/#+/g, '').trim()
  const match = (term) => term && term.length > 3 && first.includes(term.toLowerCase().slice(0, 8))
  if (match(enA)) {
    const t = norm(startTime)
    return t ? { zh: t, en: t } : undefined
  }
  if (match(enB)) {
    const t = norm(endTime)
    return t ? { zh: t, en: t } : undefined
  }
  return formatServiceTime(startTime, endTime)
}

function inferDirectionKey(zhLabel, enLabel, index, total) {
  const t = `${zhLabel} ${enLabel}`.toLowerCase()
  if (t.includes('northbound') || zhLabel.includes('北行')) return 'N'
  if (t.includes('southbound') || zhLabel.includes('南行')) return 'S'
  if (t.includes('eastbound') || zhLabel.includes('东行')) return 'E'
  if (t.includes('westbound') || zhLabel.includes('西行')) return 'W'
  if (total === 2) return index === 0 ? 'N' : 'S'
  return undefined
}

function formatServiceTime(a, b) {
  const norm = (s) => s.replace(/\s*-\s*/g, ' – ').trim()
  if (a && b && a !== b) {
    return { zh: `${norm(a)} / ${norm(b)}`, en: `${norm(a)} / ${norm(b)}` }
  }
  const one = norm(a || b)
  return one ? { zh: one, en: one } : undefined
}

function parseLengthForRoute(id, raw) {
  if (!raw) return undefined
  const mainToEast = raw.match(/Main Line \(To Eastmallow\):\s*([\d.]+)\s*km/i)
  const mainToRain = raw.match(/Main Line \(To Rainbow\):\s*([\d.]+)\s*km/i)
  if ((id === '476' || id.startsWith('476')) && mainToEast && mainToRain) {
    return {
      zh: `往东锦葵海傍路 ${mainToEast[1]} km / 往彩虹中心 ${mainToRain[1]} km`,
      en: `To Eastmallow Praya Road ${mainToEast[1]} km / To Rainbow Estate Complex ${mainToRain[1]} km`,
    }
  }
  if (id === 'N171') {
    const toR = raw.match(/To Rainbow[^:]*:\s*([\d.]+)\s*km/i)
    const toL = raw.match(/To Long Island[^:]*:\s*([\d.]+)\s*km/i)
    if (toR && toL) {
      return {
        zh: `往彩虹中心 ${toR[1]} km / 往长岛码头 ${toL[1]} km`,
        en: `To Rainbow Estate Complex ${toR[1]} km / To Long Island Ferry Pier ${toL[1]} km`,
      }
    }
  }
  if (id === 'N472') {
    const toN = raw.match(/To Norton[^:]*:\s*([\d.]+)\s*km/i)
    const toR = raw.match(/To Rainbow[^:]*:\s*([\d.]+)\s*km/i)
    if (toN && toR) {
      return {
        zh: `往北顿市中心 ${toN[1]} km / 往彩虹中心 ${toR[1]} km`,
        en: `To Norton Town Center ${toN[1]} km / To Rainbow Estate Complex ${toR[1]} km`,
      }
    }
  }
  const simple = raw.match(/([\d.]+)\s*km/i)
  if (simple && !raw.includes('<br>') && raw.split('km').length <= 3) {
    return { zh: `${simple[1]} km`, en: `${simple[1]} km` }
  }
  const parts = stripWiki(raw)
    .split(/\s*\/\s*/)
    .map((p) => p.trim())
    .filter((p) => /km/i.test(p))
  if (parts.length >= 2) {
    return { zh: parts.join(' / '), en: parts.join(' / ') }
  }
  if (simple) return { zh: `${simple[1]} km`, en: `${simple[1]} km` }
  return { zh: stripWiki(raw).slice(0, 120), en: stripWiki(raw).slice(0, 120) }
}

function inferCategory(id, row5, pattern) {
  if (/^N\d/i.test(id)) return 'night'
  if (/^R\d/i.test(id) || /R$/.test(id)) return 'special'
  if (/^C\d/i.test(id)) return 'night'
  if (/^U\d/i.test(id)) return 'express'
  if (/[P#%*]$/.test(id) || id.includes('#') || id.includes('*')) return 'special'
  if (/express|peak/i.test(row5)) return 'express'
  if (/inter/i.test(row5)) return 'inter'
  if (/night|overnight/i.test(row5)) return 'night'
  if (/central axis/i.test(row5)) return 'centralAxis'
  return pattern === 'circular' ? 'inner' : 'inner'
}

function inferPattern(endpoints, dirCount) {
  const e = endpoints.toLowerCase()
  if (dirCount <= 1 && (e.includes('↺') || /circular|loop/i.test(e))) return 'circular'
  if (e.includes('↔')) return 'bidirectional'
  if (e.includes('→') && !e.includes('↔')) return 'oneway'
  if (dirCount === 1) return 'oneway'
  return 'bidirectional'
}

async function fetchWiki(id) {
  const title = `Bus_route_${id}`
  const u = `${WIKI}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json`
  const r = await fetch(u, { headers: { 'User-Agent': 'SIBSRouteLookup/1.0' } })
  const j = await r.json()
  if (j.error) return { id, error: j.error.info }
  return { id, wikitext: j.parse?.wikitext?.['*'] ?? '' }
}

function buildRoute(id, wt) {
  const endpoints = pickField(wt, ['起訖點', '起终点'])
  const via = pickField(wt, ['途徑', '途径'])
  const lengthRaw = pickField(wt, ['路線全長', '路线全长'])
  const startTime = pickField(wt, ['起點服務時間', '起点服务时间'])
  const endTime = pickField(wt, ['終點服務時間', '终点服务时间'])
  const interval = pickField(wt, ['班次'])
  const journey = pickField(wt, ['行車時間', '行车时间'])
  const fareM = wt.match(/全程車費\s*=\s*\$?([\d.]+)/i)
  const levelM = wt.match(/Level\s*(\d+)/i) ?? wt.match(/Lv\.?\s*(\d+)/i)
  const row5 = pickField(wt, ['row5'])
  const operators = parseOperators(pickField(wt, ['目前營辦商', '目前营办商']) + wt.slice(0, 800))

  const dirTables = parseStopTables(wt)
  const pattern = inferPattern(endpoints, dirTables.length)
  const category = inferCategory(id, row5, pattern)

  const ep = parseBilingualEndpoints(endpoints)
  const origin = ep.origin
  const destination = ep.destination

  const stops = dirTables.map((dir, i) => {
    const first = dir.stops[0]?.name
    const last = dir.stops[dir.stops.length - 1]?.name
    const zhDir = `（${first?.zh ?? ''} → ${last?.zh ?? ''}）`
    const enDir = `(${first?.en ?? ''} → ${last?.en ?? ''})`
    const serviceTime = serviceTimeForDirection(dir.stops, ep.enA, ep.enB, startTime, endTime)
    const key = inferDirectionKey('', dir.enFrom + dir.enTo, i, dirTables.length)
    const prefix =
      key === 'N'
        ? { zh: '北行', en: 'Northbound' }
        : key === 'S'
          ? { zh: '南行', en: 'Southbound' }
          : key === 'E'
            ? { zh: '东行', en: 'Eastbound' }
            : key === 'W'
              ? { zh: '西行', en: 'Westbound' }
              : { zh: `方向${i + 1}`, en: `Direction ${i + 1}` }

    return {
      directionKey: key,
      direction: {
        zh: `${prefix.zh}${zhDir}`,
        en: `${prefix.en} ${enDir}`,
      },
      serviceTime,
      list: dir.stops,
    }
  })

  const zones = parseZones(wt, stops.flatMap((d) => d.list))
  const length = parseLengthForRoute(id, lengthRaw)

  return {
    id,
    number: id,
    operators: operators.length ? operators : ['FT'],
    category,
    pattern,
    zones: zones.length ? zones : [1],
    origin,
    destination,
    via: via ? { zh: via, en: via } : undefined,
    interval: interval ? { zh: interval, en: interval } : undefined,
    journeyTime: journey ? { zh: journey, en: journey } : undefined,
    fare: fareM ? `$${fareM[1]}` : undefined,
    levelRequired: levelM ? Number(levelM[1]) : undefined,
    length,
    stops: stops.length ? stops : undefined,
    serviceTime:
      !stops.length && (startTime || endTime)
        ? formatServiceTime(startTime, endTime)
        : undefined,
    wikiUrl: `https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_${encodeURIComponent(id)}`,
  }
}

function getStubIds() {
  const src = readFileSync(STUBS_FILE, 'utf8')
  const ids = [...src.matchAll(/s\('([^']+)'/g)].map((m) => m[1])
  return [...new Set([...ids, ...EXTRA_STUB_IDS])]
}

async function main() {
  const args = process.argv.slice(2)
  const ids =
    args[0] === '--all-stubs'
      ? getStubIds()
      : args.length
        ? args
        : getStubIds()

  mkdirSync(OUT_DIR, { recursive: true })
  const results = []
  const errors = []

  for (const id of ids) {
    process.stderr.write(`Fetching ${id}...\n`)
    try {
      const { wikitext, error } = await fetchWiki(id)
      if (error) {
        errors.push({ id, error })
        continue
      }
      const route = buildRoute(id, wikitext)
      writeFileSync(resolve(OUT_DIR, `${id.replace(/[%#*]/g, '_')}.json`), JSON.stringify(route, null, 2))
      results.push(route)
    } catch (e) {
      errors.push({ id, error: String(e) })
    }
    await sleep(400)
  }

  writeFileSync(resolve(OUT_DIR, '_summary.json'), JSON.stringify({ results, errors }, null, 2))
  console.log(`OK ${results.length}, ERR ${errors.length}`)
  for (const e of errors) console.log(`  ${e.id}: ${e.error}`)
}

main()
