import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** 本地 SIBS 音频资源根目录（广播、音乐、抱怨、线路报站等） */
export const SIBS_AUDIO_ROOT_CANDIDATES = [
  'E:\\SIBS资源',
  'E:\\SIBS广播',
  resolve('..', 'SIBS资源'),
  resolve('..', 'SIBS广播'),
]

export function findSibsAudioRoot() {
  for (const candidate of SIBS_AUDIO_ROOT_CANDIDATES) {
    if (existsSync(candidate)) return candidate
  }

  const eRoot = 'E:\\'
  if (!existsSync(eRoot)) return null

  for (const name of readdirSync(eRoot, { withFileTypes: true })) {
    if (!name.isDirectory() || name.name === 'sibsRouteLookupTool') continue
    if (!/SIBS/i.test(name.name)) continue
    if (!/(资源|广播)/.test(name.name)) continue
    const root = join(eRoot, name.name)
    if (existsSync(root)) return root
  }

  return null
}

export function resolveSourceSubdir(root, names) {
  for (const name of names) {
    const dir = join(root, name)
    if (existsSync(dir)) return dir
  }
  return null
}
