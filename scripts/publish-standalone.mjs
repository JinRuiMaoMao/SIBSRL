import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  APP_PAGES,
  adjustAppPageTitle,
  injectAppTabMeta,
  injectDevToolsBlock,
  injectNoScriptGuard,
  injectSecretPageMeta,
} from './lib/app-page-html.mjs'
import { generateRoutePages } from './generate-route-pages.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const built = resolve(root, 'dist', 'dev.html')
const publicAudio = resolve(root, 'public', 'audio')
const distAudio = resolve(root, 'dist', 'audio')
const rootAudio = resolve(root, 'audio')

function prepareStandaloneHtml(html, buildTag) {
  let out = html
  if (!out.includes('name="app-build"')) {
    out = out.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="app-build" content="${buildTag}" />`,
    )
  } else {
    out = out.replace(
      /name="app-build" content="[^"]*"/,
      `name="app-build" content="${buildTag}"`,
    )
  }
  if (!out.includes('class="boot-hint"')) {
    out = out.replace(
      '<div id="root"></div>',
      '<div id="root"><p class="boot-hint">加载中…</p></div>',
    )
  }
  return out
}

/**
 * 将 dist/dev.html 同步为根目录各栏目 HTML（index / ann / music …）。
 * @param {{ buildTag?: string }} [options]
 */
export function publishStandalone(options = {}) {
  const buildTag = options.buildTag ?? new Date().toISOString()

  if (!existsSync(built)) {
    throw new Error('未找到 dist/dev.html，请先运行 vite build')
  }

  const baseHtml = injectNoScriptGuard(
    injectDevToolsBlock(prepareStandaloneHtml(readFileSync(built, 'utf8'), buildTag)),
  )

  for (const page of APP_PAGES) {
    let html = injectAppTabMeta(baseHtml, page.tab)
    html = adjustAppPageTitle(html, page.titleZh)
    writeFileSync(resolve(root, page.publishFile), html)
    writeFileSync(resolve(root, 'dist', page.publishFile), html)
  }

  let secretHtml = injectSecretPageMeta(baseHtml)
  secretHtml = adjustAppPageTitle(secretHtml, '???')
  if (!secretHtml.includes('name="robots"')) {
    secretHtml = secretHtml.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta name="robots" content="noindex, nofollow" />`,
    )
  }
  writeFileSync(resolve(root, 'secret.html'), secretHtml)
  writeFileSync(resolve(root, 'dist', 'secret.html'), secretHtml)

  rmSync(resolve(root, 'tabs'), { recursive: true, force: true })
  rmSync(resolve(root, 'dist', 'tabs'), { recursive: true, force: true })

  generateRoutePages({
    targets: [resolve(root, 'routes'), resolve(root, 'dist', 'routes')],
  })

  if (existsSync(distAudio)) {
    cpSync(distAudio, rootAudio, { recursive: true })
    console.log('[publish] 已复制音频到 audio/')
  } else if (existsSync(publicAudio)) {
    cpSync(publicAudio, rootAudio, { recursive: true })
    console.log('[publish] 已复制音频到 audio/')
  }

  console.log(
    `[publish] 已更新 ${APP_PAGES.map((p) => p.publishFile).join('、')}（构建 ${buildTag}）`,
  )
  return { buildTag, built }
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  try {
    publishStandalone()
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
