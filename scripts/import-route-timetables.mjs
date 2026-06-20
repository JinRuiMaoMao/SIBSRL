import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const source = process.argv[2] ?? path.join(process.env.USERPROFILE ?? '', 'Downloads', 'message.txt')
const out = path.join(__dirname, '..', 'data', 'route-timetables.json')

let text = fs.readFileSync(source, 'utf8')
text = text.replace(/^var routeData\s*=\s*/, '').replace(/;\s*$/, '')
text = text.replace(/\bcircular:\s*true/g, '"circular": true')
text = text.replace(/,\s*([}\]])/g, '$1')

const data = JSON.parse(text)
fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
console.log(`Wrote ${data.data.length} routes → ${out}`)
