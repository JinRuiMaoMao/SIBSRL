import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { findSibsAudioRoot } from './lib/sibs-audio-root.mjs'

const LOGO_DEST_DIR = resolve('public', 'company-logos')

/** Source filename in CompanyLogo → published filename (operator code). */
const LOGO_SOURCE_MAP = [
  { match: /^csb\.png$/i, dest: 'csb.png' },
  { match: /^ft\.png$/i, dest: 'ft.png' },
  { match: /^hz\.png$/i, dest: 'hz.png' },
  { match: /^rebc\.png$/i, dest: 'rebc.png' },
  { match: /^se\(ftcc\)\.png$/i, dest: 'ftcc.png' },
]

export function syncCompanyLogos(options = {}) {
  const root = options.root ?? findSibsAudioRoot()
  if (!root) {
    console.warn('未找到 SIBS 资源根目录，跳过运营商 Logo 同步')
    return { copied: 0, dest: LOGO_DEST_DIR }
  }

  const sourceDir = join(root, 'CompanyLogo')
  if (!existsSync(sourceDir)) {
    console.warn(`未找到运营商 Logo 目录：${sourceDir}`)
    return { copied: 0, dest: LOGO_DEST_DIR, root }
  }

  mkdirSync(LOGO_DEST_DIR, { recursive: true })

  let copied = 0
  for (const name of readdirSync(sourceDir)) {
    const rule = LOGO_SOURCE_MAP.find((entry) => entry.match.test(name))
    if (!rule) continue
    const source = join(sourceDir, name)
    const dest = join(LOGO_DEST_DIR, rule.dest)
    copyFileSync(source, dest)
    copied += 1
    console.log(`运营商 Logo：${source} → ${dest}`)
  }

  if (copied === 0) {
    console.warn(`CompanyLogo 目录中未找到可识别的 Logo 文件：${sourceDir}`)
  }

  return { copied, dest: LOGO_DEST_DIR, root }
}

const isMain = process.argv[1]?.endsWith('sync-company-logos.mjs')
if (isMain) {
  syncCompanyLogos()
}
