/**
 * Parse Bus_route_476#Stop_List and write full stop data for 476 family variants.
 * Variants without their own Wiki page are derived from the main 476 tables.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { legacyWikiImportBasename, wikiImportPath } from './wiki-import-path.mjs'

const OUT_DIR = resolve('data/wiki-import')
const WIKI = 'https://sunshine-islands-roblox.fandom.com/api.php'

const VARIANT_IDS = ['476', '476*', '476#', '476#*', '476%']

function readMeta(id) {
  const path = wikiImportPath(OUT_DIR, id)
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'))
  const legacy = resolve(OUT_DIR, `${legacyWikiImportBasename(id)}.json`)
  if (existsSync(legacy)) return JSON.parse(readFileSync(legacy, 'utf8'))
  return null
}

function stripWiki(s) {
  return s
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/''+/g, '')
    .trim()
}

function parseZoneFromPlace(place) {
  const m = place.match(/Zone\s*(\d+)/i)
  return m ? Number(m[1]) : undefined
}

function isValidStop(en, zh) {
  if (/rowspan|flyover|tunnel|bypass/i.test(`${en} ${zh}`)) return false
  if (/^Zone\s*\d/i.test(en) || /^Zone\s*\d/i.test(zh)) return false
  if ((en?.length ?? 0) < 2 && (zh?.length ?? 0) < 1) return false
  return true
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
  return splitWikiRowCells(rowText.replace(/\s+/g, ' ').trim())
}

const NOTE_RE =
  /section fare|near [a-z0-9]|476[#%*]|omit this|trips that|all departures|hill road|moon island|southern central|flyover|tunnel|stratrt/i

function stopFromCells(cells) {
  let zone
  const raw = cells
    .map(stripWiki)
    .filter((c) => c && !/rowspan/i.test(c) && !/^(No|Place|Street Name|Stop Name|Note)$/i.test(c))

  for (const c of raw) {
    if (/^Zone\s*\d/i.test(c)) zone = parseZoneFromPlace(c)
  }

  const candidates = raw.filter(
    (c) =>
      !/^Zone\s*\d/i.test(c) &&
      !/^#?\d+$/.test(c) &&
      !NOTE_RE.test(c) &&
      c.length > 1 &&
      c.length <= 40,
  )

  let zh = ''
  let en = ''
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    if (/[\u4e00-\u9fff]/.test(c)) {
      zh = c
      if (i > 0 && /[A-Za-z]/.test(candidates[i - 1]) && !/[\u4e00-\u9fff]/.test(candidates[i - 1])) {
        en = candidates[i - 1]
      }
    } else if (/[A-Za-z]/.test(c) && c.length >= 3 && !en) {
      en = c
    }
  }

  if (zh && !en) {
    const enCand = candidates.find((c) => /[A-Za-z]/.test(c) && !/[\u4e00-\u9fff]/.test(c) && !NOTE_RE.test(c))
    if (enCand) en = enCand
  }
  if (zh && en && /interchange|terminus|station|pier|complex|estate|center|centre|hospital|market|bridge|road|garden|hill|tower|lane|office|university/i.test(en)) {
    const better = candidates.filter(
      (c) =>
        /[A-Za-z]/.test(c) &&
        !/[\u4e00-\u9fff]/.test(c) &&
        !NOTE_RE.test(c) &&
        /interchange|terminus/i.test(c),
    )
    if (better.length) en = better[better.length - 1]
  }

  en = stripWiki(en)
  if (!en && zh) en = zh
  if (!zh && en) zh = en
  if (!isValidStop(en, zh)) return null
  return { name: { zh, en }, zone }
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
    if (t.startsWith('|') || buf) buf += (buf ? ' ' : '') + t
  }
  if (buf) rows.push(buf)
  return rows
}

function rowMarker(firstCell, cells, direction) {
  const head = stripWiki(firstCell).replace(/\s+/g, '')
  if (/^#/.test(head)) return 'ambling'
  if (/^\*/.test(head)) return 'uniStreet'
  if (!/^\d+$/.test(head)) return 'skip'
  const stopCells = cells
    .slice(1, 5)
    .map(stripWiki)
    .filter((c) => !NOTE_RE.test(c))
    .join(' ')
    .toLowerCase()
  if (/zone 7 \(leafy university\)/i.test(stopCells) && /leafy university street/i.test(stopCells)) {
    return 'uniStreet'
  }
  if (/zone 7 \(leafy university\)/i.test(stopCells)) return 'uniRoad'
  return 'normal'
}

function includeRow(marker, variant, direction) {
  if (marker === 'skip') return false
  if (marker === 'ambling') return variant === '476#' || variant === '476#*'
  if (marker === 'uniStreet') {
    if (direction === 'E') return variant === '476*' || variant === '476#*'
    if (direction === 'W') return variant !== '476%'
    return false
  }
  if (marker === 'uniRoad') {
    return direction === 'E' && (variant === '476' || variant === '476#' || variant === '476%')
  }
  return true
}

function parseDirectionBlock(block, variant, direction) {
  const stops = []
  for (const row of parseWikitableRows(block)) {
    const cells = parseCellsFromRow(row)
    if (cells.length < 2) continue
    const marker = rowMarker(cells[0], cells, direction)
    if (!includeRow(marker, variant, direction)) continue
    const stop = stopFromCells(cells)
    if (stop) stops.push(stop)
  }
  return stops
}

function extractTables(wt) {
  const idx = wt.search(/==\s*(?:Stops|Stop\s*List)\s*==/i)
  if (idx < 0) return []
  const tail = wt.slice(idx)
  const tables = []
  const sectionRe = /===\s*To\s+([^=]+?)\s*===([\s\S]*?)(?====|$)/gi
  let m
  while ((m = sectionRe.exec(tail))) {
    const dest = stripWiki(m[1]).toLowerCase()
    const direction = dest.includes('eastmallow') ? 'E' : 'W'
    const end = m[2].search(/\n==[^=]/)
    const block = end > 0 ? m[2].slice(0, end) : m[2]
    tables.push({ direction, block })
  }
  return tables
}

function directionLabel(key, first, last) {
  const prefix =
    key === 'E'
      ? { zh: '东行', en: 'Eastbound' }
      : { zh: '西行', en: 'Westbound' }
  return {
    directionKey: key,
    direction: {
      zh: `${prefix.zh}（${first.zh} → ${last.zh}）`,
      en: `${prefix.en} (${first.en} → ${last.en})`,
    },
  }
}

function buildVariantStops(variant, tables, meta) {
  const parsed = tables.map(({ direction, block }) => ({
    direction,
    list: parseDirectionBlock(block, variant, direction),
  }))
  const east = parsed.find((d) => d.direction === 'E')?.list ?? []
  const west = parsed.find((d) => d.direction === 'W')?.list ?? []
  if (!east.length && !west.length) return []

  const stops = []
  if (east.length) {
    const first = east[0].name
    const last = east[east.length - 1].name
    stops.push({
      ...directionLabel('E', first, last),
      serviceTime: meta?.stops?.find((s) => s.directionKey === 'E')?.serviceTime ?? {
        zh: '05:30 – 00:10',
        en: '05:30 – 00:10',
      },
      list: east,
    })
  }
  if (west.length) {
    const first = west[0].name
    const last = west[west.length - 1].name
    stops.push({
      ...directionLabel('W', first, last),
      serviceTime: meta?.stops?.find((s) => s.directionKey === 'W')?.serviceTime ?? {
        zh: '05:55 – 23:55',
        en: '05:55 – 23:55',
      },
      list: west,
    })
  }
  return stops
}

async function fetch476Wikitext() {
  const u = `${WIKI}?action=parse&page=${encodeURIComponent('Bus_route_476')}&prop=wikitext&format=json`
  const r = await fetch(u, { headers: { 'User-Agent': 'SIBSRouteLookup/1.0' } })
  const j = await r.json()
  return j.parse?.wikitext?.['*'] ?? ''
}

function writeRoute(id, route) {
  writeFileSync(wikiImportPath(OUT_DIR, id), JSON.stringify(route, null, 2))
}

async function main() {
  const wt = await fetch476Wikitext()
  const tables = extractTables(wt)
  if (tables.length < 2) {
    console.error('Could not parse 476 Stop List tables from Wiki')
    process.exit(1)
  }

  for (const variant of VARIANT_IDS) {
    const meta = readMeta(variant) ?? readMeta('476')
    if (!meta) {
      console.warn('Skip', variant, '(no metadata)')
      continue
    }
    const stops = buildVariantStops(variant, tables, meta)
    const route = {
      ...meta,
      id: variant,
      number: variant,
      origin: stops[0]?.list[0]?.name ?? meta.origin,
      destination: stops[0]?.list[stops[0].list.length - 1]?.name ?? meta.destination,
      stops,
      wikiUrl: `https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_476#Stop_List`,
    }
    if (variant !== '476') {
      route.wikiUrl = `https://sunshine-islands-roblox.fandom.com/wiki/Bus_route_476#Stop_List`
    }
    writeRoute(variant, route)
    console.log(
      `Wrote ${variant}: ${stops.map((d) => `${d.directionKey}=${d.list.length}`).join(', ')}`,
    )
  }
}

main()
