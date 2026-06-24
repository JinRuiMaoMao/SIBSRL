/**
 * 将 data/stopNameSubs.ts 中的副站名规则写入 data/wiki-import/*.json
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyStopNameSubsToRoute } from './lib/stop-name-subs.mjs'

const importDir = resolve('data/wiki-import')
let changed = 0

for (const file of readdirSync(importDir)) {
  if (!file.endsWith('.json') || file.startsWith('_')) continue
  const path = resolve(importDir, file)
  const route = JSON.parse(readFileSync(path, 'utf8'))
  const next = applyStopNameSubsToRoute(route)
  const before = JSON.stringify(route)
  const after = JSON.stringify(next)
  if (before !== after) {
    writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`)
    changed += 1
    console.log(`Updated ${file}`)
  }
}

console.log(`Done: ${changed} wiki-import file(s) updated`)
