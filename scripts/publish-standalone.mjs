import { copyFileSync, cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const built = resolve('dist', 'dev.html')
const target = resolve('index.html')
const publicAudio = resolve('public', 'audio')
const distAudio = resolve('dist', 'audio')
const rootAudio = resolve('audio')

if (!existsSync(built)) {
  console.error('未找到构建产物 dist/dev.html，请先运行 vite build')
  process.exit(1)
}

let html = readFileSync(built, 'utf8')
const buildTag = new Date().toISOString()
if (!html.includes('name="app-build"')) {
  html = html.replace(
    '<meta name="viewport"',
    `<meta name="app-build" content="${buildTag}" />\n    <meta name="viewport"`,
  )
} else {
  html = html.replace(/name="app-build" content="[^"]*"/, `name="app-build" content="${buildTag}"`)
}
writeFileSync(target, html)

if (existsSync(distAudio)) {
  cpSync(distAudio, rootAudio, { recursive: true })
  console.log('已复制音频到 audio/（与 index.html 同级）')
} else if (existsSync(publicAudio)) {
  cpSync(publicAudio, rootAudio, { recursive: true })
  console.log('已复制音频到 audio/（与 index.html 同级）')
}

console.log('已生成可独立打开的 index.html（单文件，含全部 JS/CSS）')
