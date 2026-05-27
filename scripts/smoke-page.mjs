import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'

const root = resolve(import.meta.dirname, '..')
const indexUrl = pathToFileURL(resolve(root, 'index.html')).href

async function checkPage(label, url) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  const rootText = await page.locator('#root').innerText().catch(() => '')
  const rootHtml = await page.locator('#root').innerHTML().catch(() => '')
  const title = await page.title()
  await browser.close()
  console.log(`\n=== ${label} ===`)
  console.log('url:', url)
  console.log('title:', title)
  console.log('root text length:', rootText.length, rootText.slice(0, 120))
  console.log('root html length:', rootHtml.length)
  if (errors.length) {
    console.log('errors:')
    errors.slice(0, 8).forEach((e) => console.log(' ', e))
  } else {
    console.log('errors: none')
  }
  return { ok: rootText.length > 20, errors }
}

async function main() {
  const fileResult = await checkPage('file index.html', indexUrl)

  const vite = await createServer({
    configFile: resolve(root, 'vite.config.ts'),
    server: { port: 5173 },
  })
  await vite.listen()
  const port = vite.config.server.port
  const devRoot = await checkPage('vite dev /', `http://localhost:${port}/`)
  const devResult = await checkPage('vite dev /dev.html', `http://localhost:${port}/dev.html`)
  if (!devRoot.ok || !devResult.ok) process.exit(1)
  await vite.close()

  if (!fileResult.ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
