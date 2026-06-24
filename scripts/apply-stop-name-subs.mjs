/**
 * 将 data/stopNameSubs.ts 中的副站名规则写入 data/wiki-import/*.json 与 data/secret-routes.json
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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

const secretPath = resolve('data/secret-routes.json')
if (existsSync(secretPath)) {
  const routes = JSON.parse(readFileSync(secretPath, 'utf8'))
  const next = routes.map(applyStopNameSubsToRoute)
  const before = JSON.stringify(routes)
  const after = JSON.stringify(next)
  if (before !== after) {
    writeFileSync(secretPath, `${JSON.stringify(next, null, 2)}\n`)
    changed += 1
    console.log('Updated secret-routes.json')
  }
}

console.log(`Done: ${changed} file(s) updated`)
