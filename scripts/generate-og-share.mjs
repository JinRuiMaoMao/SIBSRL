import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const logoPath = resolve(root, 'public', 'sibs-logo.png')
const outPath = resolve(root, 'public', 'og-share.png')
const NOTO_FONT_DIR = resolve(root, 'node_modules/@fontsource/noto-sans-sc/files')

function readLogoDataUri() {
  if (!existsSync(logoPath)) return ''
  const base64 = readFileSync(logoPath).toString('base64')
  return `data:image/png;base64,${base64}`
}

function buildEmbeddedNotoSansScFontCss() {
  const weights = [400, 700, 800]
  return weights
    .map((weight) => {
      const file = resolve(
        NOTO_FONT_DIR,
        `noto-sans-sc-chinese-simplified-${weight}-normal.woff2`,
      )
      if (!existsSync(file)) {
        throw new Error(
          `Missing Noto Sans SC (run npm install). Expected: ${file}`,
        )
      }
      const data = readFileSync(file).toString('base64')
      return `@font-face {
  font-family: 'Noto Sans SC';
  font-style: normal;
  font-weight: ${weight};
  font-display: block;
  src: url('data:font/woff2;base64,${data}') format('woff2');
}`
    })
    .join('\n')
}

function buildOgShareHtml(logoDataUri, fontCss) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <style>
    ${fontCss}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      font-family: 'Noto Sans SC', sans-serif;
    }
    .card {
      width: 1200px;
      height: 630px;
      background: linear-gradient(145deg, #0a1020 0%, #121a30 42%, #0c1222 100%);
      color: #eef2f8;
      display: flex;
      flex-direction: column;
      padding: 56px 72px;
      position: relative;
    }
    .card::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 520px 280px at 88% 18%, rgba(245, 185, 66, 0.18), transparent 70%),
        radial-gradient(ellipse 400px 240px at 12% 88%, rgba(96, 165, 250, 0.12), transparent 65%);
      pointer-events: none;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 28px;
      z-index: 1;
    }
    .logo {
      width: 96px;
      height: 96px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.06);
      padding: 12px;
      object-fit: contain;
    }
    .brand {
      font-size: 28px;
      font-weight: 600;
      color: #f5b942;
      letter-spacing: 0.02em;
    }
    .headline {
      margin-top: 48px;
      font-size: 64px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
      z-index: 1;
      max-width: 920px;
    }
    .sub {
      margin-top: 20px;
      font-size: 30px;
      font-weight: 400;
      color: #94a3b8;
      z-index: 1;
    }
    .cta {
      margin-top: auto;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .pill {
      background: #f5b942;
      color: #1a2233;
      font-size: 28px;
      font-weight: 700;
      padding: 18px 36px;
      border-radius: 999px;
    }
    .cta-note {
      font-size: 24px;
      font-weight: 400;
      color: #c8d3e4;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="row">
      ${logoDataUri ? `<img class="logo" src="${logoDataUri}" alt="" />` : ''}
      <div class="brand">SIBS · Sunshine Islands Bus Simulator</div>
    </div>
    <h1 class="headline">阳光群岛 Roblox 巴士线路查询</h1>
    <p class="sub">站序 · 车费 · 群岛地图 · 报站音频 · 每日挑战</p>
    <div class="cta">
      <div class="pill">立即打开线路查询</div>
      <span class="cta-note">jinruimaomao.github.io/SIBSRL</span>
    </div>
  </div>
</body>
</html>`
}

export async function generateOgShareImage(options = {}) {
  const dest = options.dest ?? outPath
  const logoDataUri = readLogoDataUri()
  const fontCss = buildEmbeddedNotoSansScFontCss()
  const html = buildOgShareHtml(logoDataUri, fontCss)

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    })
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(async () => {
      const loads = [
        document.fonts.load('600 28px "Noto Sans SC"'),
        document.fonts.load('800 64px "Noto Sans SC"'),
        document.fonts.load('400 30px "Noto Sans SC"'),
        document.fonts.load('700 28px "Noto Sans SC"'),
      ]
      await Promise.all(loads)
      await document.fonts.ready
    })
    await page.screenshot({ path: dest, type: 'png' })
    return { ok: true, dest }
  } finally {
    await browser.close()
  }
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const result = await generateOgShareImage()
  console.log(`[og-share] 已生成 ${result.dest} (1200×630)`)
}
