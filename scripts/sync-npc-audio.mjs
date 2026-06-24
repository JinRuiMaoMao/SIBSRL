import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findSibsAudioRoot } from './lib/sibs-audio-root.mjs'
import { EXCLUDED_NPC_CATEGORIES } from './lib/npc-audio-path.mjs'
import { buildNpcManifest } from './build-npc-manifest.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
export const NPC_AUDIO_PUBLIC = resolve(root, 'public', 'audio', 'npc')

function isAudioFile(name) {
  return /\.(mp3|ogg)$/i.test(name)
}

function resolveNpcRoot(sibsRoot) {
  const candidates = [join(sibsRoot, 'NPC'), join(sibsRoot, 'npc')]
  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }
  return null
}

export function syncNpcAudio(options = {}) {
  const sibsRoot = options.sibsRoot ?? findSibsAudioRoot()
  if (!sibsRoot) {
    console.warn('未找到 SIBS 资源根目录，跳过 NPC 音频同步')
    return { copied: 0, categories: 0 }
  }

  const npcRoot = resolveNpcRoot(sibsRoot)
  if (!npcRoot) {
    console.warn(`未找到 NPC 源目录（请在 ${sibsRoot}\\NPC 放入分类文件夹）`)
    return { copied: 0, categories: 0 }
  }

  rmSync(NPC_AUDIO_PUBLIC, { recursive: true, force: true })
  mkdirSync(NPC_AUDIO_PUBLIC, { recursive: true })

  let copied = 0
  let categories = 0

  for (const entry of readdirSync(npcRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (EXCLUDED_NPC_CATEGORIES.has(entry.name)) {
      console.log(`NPC：跳过分类「${entry.name}」`)
      continue
    }

    categories += 1
    const srcDir = join(npcRoot, entry.name)
    const destDir = join(NPC_AUDIO_PUBLIC, entry.name)
    mkdirSync(destDir, { recursive: true })

    const files = readdirSync(srcDir).filter(isAudioFile).sort((a, b) => a.localeCompare(b, 'zh-Hans'))
    for (const file of files) {
      copyFileSync(join(srcDir, file), join(destDir, file))
      copied += 1
    }

    console.log(`NPC · ${entry.name}：${files.length} 个 → ${destDir}`)
  }

  if (copied > 0) {
    console.log(`[npc] 已同步 ${copied} 个音频（${categories} 个分类）→ public/audio/npc/`)
  } else {
    console.warn('[npc] 未找到可同步的 NPC 音频')
  }

  buildNpcManifest()
  return { copied, categories }
}

const isMain = process.argv[1]?.endsWith('sync-npc-audio.mjs')
if (isMain) {
  syncNpcAudio()
}
