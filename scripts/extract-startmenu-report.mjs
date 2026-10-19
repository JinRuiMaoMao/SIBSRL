/**
 * Targeted StartMenu / StartMenuRB / TopBar property report from rbxlx.
 * Computes screen rects at 1920×1080 assuming StartScreen fills viewport.
 */
import fs from 'node:fs'

const RBXLX =
  'C:/Users/Jinrui/Desktop/place 1588965415 Sunshine Islands Bus Simulator NEW.rbxlx'
const VIEW = { w: 1920, h: 1080 }

const lines = fs.readFileSync(RBXLX, 'utf8').split(/\r?\n/)

function parseProps(startLine, endLine) {
  const block = lines.slice(startLine, endLine + 1).join('\n')
  const pick = (re) => {
    const m = block.match(re)
    return m ? m[1] : null
  }
  const udim2 = (prop) => {
    const re = new RegExp(`<UDim2 name="${prop}">([\\s\\S]*?)</UDim2>`)
    const m = block.match(re)
    if (!m) return null
    const c = m[1]
    const n = (t) => Number(c.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1] ?? 0)
    return { xScale: n('XS'), xOffset: n('XO'), yScale: n('YS'), yOffset: n('YO') }
  }
  const vec2 = (prop) => {
    const re = new RegExp(`<Vector2 name="${prop}">([\\s\\S]*?)</Vector2>`)
    const m = block.match(re)
    if (!m) return { x: 0, y: 0 }
    const c = m[1]
    const n = (t) => Number(c.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1] ?? 0)
    return { x: n('X'), y: n('Y') }
  }
  const color = (prop) => {
    const re = new RegExp(`<Color3 name="${prop}">([\\s\\S]*?)</Color3>`)
    const m = block.match(re)
    if (!m) return null
    const c = m[1]
    const n = (t) => Math.round(Number(c.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1] ?? 0) * 255)
    return `rgb(${n('R')} ${n('G')} ${n('B')})`
  }
  return {
    name: pick(/<string name="Name">([^<]+)<\/string>/),
    className: null,
    anchor: vec2('AnchorPoint'),
    position: udim2('Position'),
    size: udim2('Size'),
    visible: pick(/<bool name="Visible">([^<]+)<\/bool>/),
    bgTransparency: pick(/<float name="BackgroundTransparency">([^<]+)<\/float>/),
    bgColor: color('BackgroundColor3'),
    textColor: color('TextColor3'),
    text: pick(/<string name="Text">([^<]*)<\/string>/),
    textSize: pick(/<float name="TextSize">([^<]+)<\/float>/),
    layoutOrder: pick(/<int name="LayoutOrder">([^<]+)<\/int>/),
    image: pick(/<Content name="Image"><url>([^<]*)<\/url><\/Content>/),
    font: pick(/<Family><url>([^<]*)<\/url><\/Family>/),
    zIndex: pick(/<int name="ZIndex">([^<]+)<\/int>/),
  }
}

function findItemLineForName(nameLineIdx) {
  for (let j = nameLineIdx; j >= Math.max(0, nameLineIdx - 250); j--) {
    if (lines[j].includes('<Item class=')) {
      const cls = lines[j].match(/class="([^"]+)"/)?.[1]
      // find closing Properties for this item
      let propsStart = -1
      let propsEnd = -1
      for (let k = j; k <= Math.min(lines.length - 1, j + 300); k++) {
        if (lines[k].includes('<Properties>')) propsStart = k
        if (propsStart >= 0 && lines[k].includes('</Properties>')) {
          propsEnd = k
          break
        }
      }
      if (propsEnd < 0) return null
      const p = parseProps(propsStart, propsEnd)
      p.className = cls
      p.line = nameLineIdx + 1
      return p
    }
  }
  return null
}

function fmtU(u) {
  if (!u) return '?'
  return `{${u.xScale},${u.xOffset}},{${u.yScale},${u.yOffset}}`
}

function resolvePx(u, parent) {
  return u.xScale * parent + u.xOffset
}

function rect(node, parentRect) {
  const pos = node.position ?? { xScale: 0, xOffset: 0, yScale: 0, yOffset: 0 }
  const size = node.size ?? { xScale: 1, xOffset: 0, yScale: 1, yOffset: 0 }
  const anchor = node.anchor ?? { x: 0, y: 0 }
  const w = resolvePx({ xScale: size.xScale, xOffset: size.xOffset }, parentRect.w)
  const h = resolvePx({ xScale: size.yScale, xOffset: size.yOffset }, parentRect.h)
  const px = resolvePx(pos, parentRect.w)
  const py = resolvePx({ xScale: pos.yScale, xOffset: pos.yOffset }, parentRect.h)
  const x = parentRect.x + px - anchor.x * w
  const y = parentRect.y + py - anchor.y * h
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
}

function fmtRect(r) {
  return `X=${r.x} Y=${r.y} W=${r.w} H=${r.h}`
}

// Scan StartMenu region only (line range from rbxlx)
const START = 639560
const END = 682600
const namesWanted = new Set([
  'StartMenu',
  'Top',
  'Main',
  'L',
  'R',
  'Version',
  'PlayBtn',
  'ServerListBtn',
  'ProfileBtn',
  'LangBtn',
  'ChangeLog',
  'ComingEvent',
  'DailyChallenge',
  'Title',
  'Logo',
  'StartMenuRB',
  'MainButtons',
  'AboutButtons',
  'Music',
  'FAQ',
  'About',
  'Shop',
  'Credit',
  'ChangeLog',
  'Thumb',
  'EnterBtn',
  'EventTitle',
  'Countdown',
  'Date',
  'Content',
  'ImageLabel',
])

const found = []
for (let i = START; i < END; i++) {
  const m = lines[i].match(/<string name="Name">([^<]+)<\/string>/)
  if (!m) continue
  const name = m[1]
  if (!namesWanted.has(name)) continue
  const node = findItemLineForName(i)
  if (!node) continue
  found.push(node)
}

// Dedupe by name+line keeping all (some names repeat e.g. Logo)
console.log(`=== StartMenu region nodes (${found.length}) @ ${VIEW.w}×${VIEW.h} ===\n`)

// Build hierarchy manually for rect chain
const byName = Object.fromEntries(found.map((n) => [n.name, n]))
const ss = { x: 0, y: 0, w: VIEW.w, h: VIEW.h }
const menu = byName.StartMenu
const menuRect = menu ? rect(menu, ss) : ss

const chain = [
  ['StartScreen (viewport)', ss, null],
  ['StartMenu', menuRect, menu],
  ['StartMenu.Top', rect(byName.Top, menuRect), byName.Top],
  ['StartMenu.Main', null, byName.Main],
  ['StartMenu.Main.L', null, byName.L],
  ['StartMenu.Main.R', null, byName.R],
  ['PlayBtn', null, byName.PlayBtn],
  ['ServerListBtn', null, byName.ServerListBtn],
  ['ProfileBtn', null, byName.ProfileBtn],
  ['LangBtn', null, byName.LangBtn],
  ['Version', null, byName.Version],
  ['R.ChangeLog', null, byName.ChangeLog],
  ['R.ComingEvent', null, byName.ComingEvent],
  ['R.DailyChallenge', null, byName.DailyChallenge],
  ['StartMenuRB', null, byName.StartMenuRB],
  ['MainButtons', null, byName.MainButtons],
  ['AboutButtons', null, byName.AboutButtons],
]

// compute Main if present
if (byName.Main) {
  const mainRect = rect(byName.Main, menuRect)
  chain.find((c) => c[0] === 'StartMenu.Main')[1] = mainRect
  if (byName.L) chain.find((c) => c[0] === 'StartMenu.Main.L')[1] = rect(byName.L, mainRect)
  if (byName.R) {
    const rRect = rect(byName.R, mainRect)
    chain.find((c) => c[0] === 'StartMenu.Main.R')[1] = rRect
    if (byName.ChangeLog) chain.find((c) => c[0] === 'R.ChangeLog')[1] = rect(byName.ChangeLog, rRect)
    if (byName.ComingEvent) chain.find((c) => c[0] === 'R.ComingEvent')[1] = rect(byName.ComingEvent, rRect)
    if (byName.DailyChallenge) chain.find((c) => c[0] === 'R.DailyChallenge')[1] = rect(byName.DailyChallenge, rRect)
  }
  if (byName.L) {
    const lRect = rect(byName.L, rect(byName.Main, menuRect))
    if (byName.PlayBtn) chain.find((c) => c[0] === 'PlayBtn')[1] = rect(byName.PlayBtn, lRect)
    if (byName.ServerListBtn) chain.find((c) => c[0] === 'ServerListBtn')[1] = rect(byName.ServerListBtn, lRect)
    if (byName.ProfileBtn) chain.find((c) => c[0] === 'ProfileBtn')[1] = rect(byName.ProfileBtn, lRect)
    if (byName.LangBtn) chain.find((c) => c[0] === 'LangBtn')[1] = rect(byName.LangBtn, lRect)
  }
}
if (byName.Version) chain.find((c) => c[0] === 'Version')[1] = rect(byName.Version, menuRect)
if (byName.StartMenuRB) {
  const rbRect = rect(byName.StartMenuRB, ss)
  chain.find((c) => c[0] === 'StartMenuRB')[1] = rbRect
  if (byName.MainButtons) chain.find((c) => c[0] === 'MainButtons')[1] = rect(byName.MainButtons, rbRect)
  if (byName.AboutButtons) chain.find((c) => c[0] === 'AboutButtons')[1] = rect(byName.AboutButtons, rbRect)
}

for (const [label, r, node] of chain) {
  if (!node && label.includes('viewport')) {
    console.log(`${label.padEnd(28)} ${fmtRect(r)}`)
    continue
  }
  if (!node) continue
  console.log(`\n--- ${label} (L${node.line}, ${node.className}) ---`)
  console.log(`  Visible: ${node.visible}`)
  console.log(`  AnchorPoint: (${node.anchor.x}, ${node.anchor.y})`)
  console.log(`  Position: ${fmtU(node.position)}`)
  console.log(`  Size: ${fmtU(node.size)}`)
  if (r) console.log(`  Screen @1080p: ${fmtRect(r)}`)
  if (node.bgColor) console.log(`  BackgroundColor3: ${node.bgColor} transparency=${node.bgTransparency}`)
  if (node.text != null && node.text !== '') console.log(`  Text: ${JSON.stringify(node.text)}`)
  if (node.textColor) console.log(`  TextColor3: ${node.textColor} size=${node.textSize}`)
  if (node.image) console.log(`  Image: ${node.image}`)
  if (node.font) console.log(`  Font: ${node.font}`)
}

// R panel children summary
console.log('\n=== StartMenu.Main.R panel siblings (Visible in place file) ===')
for (const n of found.filter((x) => ['ChangeLog', 'ComingEvent', 'DailyChallenge'].includes(x.name))) {
  console.log(`  ${n.name}: Visible=${n.visible} Size=${fmtU(n.size)} Position=${fmtU(n.position)} Anchor=(${n.anchor.x},${n.anchor.y})`)
}

// TopBar scan
console.log('\n=== TopBar (MainCtr.RouteCtr.TopBar) ===')
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].includes('<string name="Name">TopBar</string>')) continue
  const ctx = lines.slice(Math.max(0, i - 50), i).join('\n')
  if (!ctx.includes('RouteCtr')) continue
  const node = findItemLineForName(i)
  if (!node) break
  const tbRect = rect(node, ss)
  console.log(`TopBar Visible=${node.visible} Size=${fmtU(node.size)} Position=${fmtU(node.position)} Screen=${fmtRect(tbRect)}`)
  // children names in next 3000 lines until sibling StartMenu level
  for (let j = i; j < i + 8000; j++) {
    const m = lines[j].match(/<string name="Name">([^<]+)<\/string>/)
    if (!m) continue
    const child = findItemLineForName(j)
    if (!child || child.line <= node.line) continue
    if (['TopBar', 'UIListLayout', 'UIPadding', 'UICorner'].includes(child.name)) {
      if (child.name === 'TopBar' && child.line > node.line + 5) break
      continue
    }
    const cr = rect(child, tbRect)
    console.log(
      `  ${child.name} (${child.className}) Vis=${child.visible} pos=${fmtU(child.position)} size=${fmtU(child.size)} screen=${fmtRect(cr)} text=${JSON.stringify(child.text ?? '')}`,
    )
  }
  break
}
