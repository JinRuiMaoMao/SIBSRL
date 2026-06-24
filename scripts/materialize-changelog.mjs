#!/usr/bin/env node
/**
 * 将 versionUpdatesRaw 中遗留的 items 扁平列表物化为 additions / fixes 结构并写回源文件。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  normalizeChangelogEntry,
  serializeVersionUpdatesRaw,
} from '../src/data/changelogStructure.ts'
import { versionUpdatesRaw } from '../src/data/versionUpdates.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const targetPath = join(__dirname, '../src/data/versionUpdates.ts')

const normalized = versionUpdatesRaw.map(normalizeChangelogEntry)
const serialized = serializeVersionUpdatesRaw(normalized)

const source = readFileSync(targetPath, 'utf8')
const startMarker = 'const versionUpdatesRaw: VersionUpdateEntry[] = ['
const exportMarker = '\nexport const versionUpdates ='

const start = source.indexOf(startMarker)
const exportStart = source.indexOf(exportMarker, start)
if (start < 0 || exportStart < 0) {
  throw new Error('Could not locate versionUpdatesRaw block in versionUpdates.ts')
}

const next = `${source.slice(0, start)}${serialized}${source.slice(exportStart)}`
writeFileSync(targetPath, next, 'utf8')
console.log(`[materialize-changelog] Rewrote ${normalized.length} entries in ${targetPath}`)
