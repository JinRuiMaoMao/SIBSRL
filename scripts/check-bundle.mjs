import { readFileSync } from 'node:fs'

const html = readFileSync('index.html', 'utf8')
const checks = [
  '线路编号规则',
  'numbering-guide',
  'NumberingGuide',
  '经停车站',
  'route-detail-sheet',
  '往仙贝广场 11.8 km',
]
for (const c of checks) {
  console.log(`${c}: ${html.includes(c)}`)
}
const m = html.match(/name="app-build" content="([^"]+)"/)
console.log('app-build:', m?.[1] ?? 'missing')
const built = readFileSync('dist/dev.html', 'utf8')
console.log('dist has charset tag:', built.includes('<meta charset="UTF-8" />'))
console.log('dist app-build:', built.match(/name="app-build"/) ? 'yes' : 'no')
