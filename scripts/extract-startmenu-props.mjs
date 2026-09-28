import fs from 'node:fs'

const path = 'C:/Users/Jinrui/Desktop/place 1588965415 Sunshine Islands Bus Simulator NEW.rbxlx'
const text = fs.readFileSync(path, 'utf8')
const lines = text.split(/\r?\n/)

function readUdimFromBlock(block, propName) {
  const re = new RegExp(`<UDim2 name="${propName}">([\\s\\S]*?)</UDim2>`)
  const m = block.match(re)
  if (!m) return null
  const chunk = m[1]
  const pick = (tag) => {
    const hit = chunk.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
    return hit ? hit[1] : null
  }
  return { XS: pick('XS'), XO: pick('XO'), YS: pick('YS'), YO: pick('YO') }
}

function readAnchorFromBlock(block) {
  const m = block.match(/<Vector2 name="AnchorPoint">([\s\S]*?)<\/Vector2>/)
  if (!m) return null
  const chunk = m[1]
  const pick = (tag) => {
    const hit = chunk.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
    return hit ? hit[1] : null
  }
  return { X: pick('X'), Y: pick('Y') }
}

function readScalar(block, tag, propName) {
  const m = block.match(new RegExp(`<${tag} name="${propName}">([^<]*)</${tag}>`))
  return m ? m[1] : null
}

function extractByName(name, { parentHint = null, occurrence = 0 } = {}) {
  let found = 0
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(`<string name="Name">${name}</string>`)) continue

    // Walk back to enclosing <Properties>
    let propsStart = -1
    for (let j = i; j >= Math.max(0, i - 120); j--) {
      if (lines[j].includes('<Properties>')) {
        propsStart = j
        break
      }
    }
    if (propsStart < 0) continue

    if (parentHint) {
      const context = lines.slice(Math.max(0, propsStart - 80), propsStart).join('\n')
      if (!context.includes(parentHint)) continue
    }

    if (found++ < occurrence) continue

    let propsEnd = propsStart
    for (let j = propsStart; j < Math.min(lines.length, propsStart + 200); j++) {
      if (lines[j].includes('</Properties>')) {
        propsEnd = j
        break
      }
    }
    const block = lines.slice(propsStart, propsEnd + 1).join('\n')
    return {
      line: i + 1,
      AnchorPoint: readAnchorFromBlock(block),
      Position: readUdimFromBlock(block, 'Position'),
      Size: readUdimFromBlock(block, 'Size'),
      BackgroundTransparency: readScalar(block, 'float', 'BackgroundTransparency'),
      LayoutOrder: readScalar(block, 'int', 'LayoutOrder'),
      Visible: readScalar(block, 'bool', 'Visible'),
    }
  }
  return null
}

const targets = [
  ['StartMenu', { parentHint: 'StartScreen' }],
  ['StartMenuRB', { parentHint: 'StartScreen' }],
  ['MainButtons', { parentHint: 'StartMenuRB' }],
  ['AboutButtons', { parentHint: 'StartMenuRB' }],
  ['Top', { parentHint: 'StartMenu' }],
  ['Main', { parentHint: 'StartMenu' }],
  ['Version', { parentHint: 'StartMenu' }],
  ['PlayBtn', { parentHint: 'StartMenu' }],
  ['LangBtn', { parentHint: 'StartMenu' }],
  ['FrontPage', { parentHint: 'StartScreen' }],
  ['DailyChallenge', { parentHint: 'StartMenu' }],
  ['ChangeLog', { parentHint: 'StartMenu' }],
  ['L', { parentHint: 'StartMenu.Main' }],
  ['R', { parentHint: 'StartMenu.Main' }],
]

for (const [name, opts] of targets) {
  const data = extractByName(name, opts)
  console.log(`\n=== ${name} ===`)
  console.log(JSON.stringify(data, null, 2))
}
