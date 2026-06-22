import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { findSibsAudioRoot } from './lib/sibs-audio-root.mjs'

const LOGO_SOURCE_NAMES = ['SIBS Logo.png', 'SIBS Logo.PNG', 'sibs-logo.png']
const LOGO_DEST = resolve('public', 'sibs-logo.png')

export function syncBrandAssets(options = {}) {
  const root = options.root ?? findSibsAudioRoot()
  if (!root) {
    console.warn('未找到 SIBS 资源根目录（E:\\SIBS资源 等），跳过 Logo 同步')
    return { copied: false, dest: LOGO_DEST }
  }

  let source = null
  for (const name of LOGO_SOURCE_NAMES) {
    const candidate = join(root, name)
    if (existsSync(candidate)) {
      source = candidate
      break
    }
  }

  if (!source) {
    console.warn(`未找到 Logo 源文件（请在 ${root} 放入 SIBS Logo.png）`)
    return { copied: false, dest: LOGO_DEST, root }
  }

  mkdirSync(resolve('public'), { recursive: true })
  copyFileSync(source, LOGO_DEST)
  console.log(`站点 Logo：${source} → ${LOGO_DEST}`)
  return { copied: true, source, dest: LOGO_DEST, root }
}

const isMain = process.argv[1]?.endsWith('sync-brand-assets.mjs')
if (isMain) {
  syncBrandAssets()
}
