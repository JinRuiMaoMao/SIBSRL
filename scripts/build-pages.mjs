import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

execSync('npm run build:only', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE: '/SIBSRL/' },
})
