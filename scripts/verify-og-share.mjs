import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const paths = [
  resolve(root, 'public', 'og-share.png'),
  resolve(root, 'public', 'og-share-v2.png'),
  resolve(root, 'og-share-v2.png'),
]

/** MD5 of the old Playwright screenshot without CJK fonts (tofu squares). */
const BROKEN_OG_SHARE_MD5 = '32fb217d374d88ba6748620e9adc36a8'
const MIN_BYTES = 340_000

for (const file of paths) {
  if (!existsSync(file)) continue
  const buf = readFileSync(file)
  const md5 = createHash('md5').update(buf).digest('hex')
  if (buf.length < MIN_BYTES) {
    console.error(`[og-share] ${file} too small (${buf.length} bytes)`)
    process.exit(1)
  }
  if (md5 === BROKEN_OG_SHARE_MD5) {
    console.error(`[og-share] ${file} is the broken tofu image (md5=${md5})`)
    process.exit(1)
  }
  console.log(`[og-share] ok ${file} (${buf.length} bytes, md5=${md5})`)
}

if (!existsSync(resolve(root, 'public', 'og-share-v2.png'))) {
  console.error('[og-share] missing public/og-share-v2.png')
  process.exit(1)
}
