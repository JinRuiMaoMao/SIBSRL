/**
 * Extract StartScreen UI tree: Properties, hierarchy, and computed screen rects (1920×1080).
 */
import fs from 'node:fs'

const RBXLX =
  'C:/Users/Jinrui/Desktop/place 1588965415 Sunshine Islands Bus Simulator NEW.rbxlx'
const VIEWPORT = { w: 1920, h: 1080 }

const text = fs.readFileSync(RBXLX, 'utf8')
const lines = text.split(/\r?\n/)

function parseUdim2(block, prop) {
  const re = new RegExp(`<UDim2 name="${prop}">([\\s\\S]*?)</UDim2>`)
  const m = block.match(re)
  if (!m) return null
  const chunk = m[1]
  const pick = (tag) => {
    const hit = chunk.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
    return hit ? Number(hit[1]) : 0
  }
  return { xScale: pick('XS'), xOffset: pick('XO'), yScale: pick('YS'), yOffset: pick('YO') }
}

function parseVector2(block, prop) {
  const re = new RegExp(`<Vector2 name="${prop}">([\\s\\S]*?)</Vector2>`)
  const m = block.match(re)
  if (!m) return { x: 0, y: 0 }
  const chunk = m[1]
  const pick = (tag) => {
    const hit = chunk.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
    return hit ? Number(hit[1]) : 0
  }
  return { x: pick('X'), y: pick('Y') }
}

function parseColor3(block, prop) {
  const re = new RegExp(`<Color3 name="${prop}">([\\s\\S]*?)</Color3>`)
  const m = block.match(re)
  if (!m) return null
  const chunk = m[1]
  const pick = (tag) => {
    const hit = chunk.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
    return hit ? Number(hit[1]) : 0
  }
  const r = Math.round(pick('R') * 255)
  const g = Math.round(pick('G') * 255)
  const b = Math.round(pick('B') * 255)
  return `rgb(${r} ${g} ${b})`
}

function parseScalar(block, tag, prop) {
  const m = block.match(new RegExp(`<${tag} name="${prop}">([^<]*)</${tag}>`))
  return m ? m[1] : null
}

function udim2ToPx(ud, parentPx) {
  return ud.xScale * parentPx + ud.xOffset
}

function computeRect(node, parentRect) {
  const anchor = node.anchor
  const pos = node.position
  const size = node.size
  const pw = parentRect.w
  const ph = parentRect.h
  const width = size.xScale * pw + size.xOffset
  const height = size.yScale * ph + size.yOffset
  const px = pos.xScale * pw + pos.xOffset
  const py = pos.yScale * ph + pos.yOffset
  const x = parentRect.x + px - anchor.x * width
  const y = parentRect.y + py - anchor.y * height
  return { x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }
}

function readItemAt(startLine) {
  // startLine points to <Item class=...
  let depth = 0
  let propsBlock = ''
  let className = ''
  let name = ''
  let propsStart = -1
  let propsEnd = -1
  let children = []
  let i = startLine

  const openM = lines[i].match(/<Item class="([^"]+)"/)
  if (!openM) return null
  className = openM[1]
  depth = 1
  i++

  while (i < lines.length && depth > 0) {
    const line = lines[i]
    if (line.includes('<Properties>')) propsStart = i
    if (propsStart >= 0 && propsEnd < 0 && line.includes('</Properties>')) propsEnd = i
    const childOpen = line.match(/<Item class="([^"]+)"/)
    if (childOpen && depth === 1) {
      const child = readItemAt(i)
      if (child) {
        children.push(child)
        i = child.endLine + 1
        continue
      }
    }
    if (line.includes('<Item class=')) depth++
    if (line.includes('</Item>')) {
      depth--
      if (depth === 0) {
        propsBlock = lines.slice(propsStart, propsEnd + 1).join('\n')
        name = parseScalar(propsBlock, 'string', 'Name') ?? className
        const node = {
          className,
          name,
          startLine: startLine + 1,
          endLine: i,
          anchor: parseVector2(propsBlock, 'AnchorPoint'),
          position: parseUdim2(propsBlock, 'Position') ?? { xScale: 0, xOffset: 0, yScale: 0, yOffset: 0 },
          size: parseUdim2(propsBlock, 'Size') ?? { xScale: 1, xOffset: 0, yScale: 1, yOffset: 0 },
          visible: parseScalar(propsBlock, 'bool', 'Visible'),
          backgroundTransparency: parseScalar(propsBlock, 'float', 'BackgroundTransparency'),
          backgroundColor3: parseColor3(propsBlock, 'BackgroundColor3'),
          text: parseScalar(propsBlock, 'string', 'Text'),
          textColor3: parseColor3(propsBlock, 'TextColor3'),
          layoutOrder: parseScalar(propsBlock, 'int', 'LayoutOrder'),
          image: parseScalar(propsBlock, 'Content', 'Image') ?? parseScalar(propsBlock, 'string', 'Image'),
          zIndex: parseScalar(propsBlock, 'int', 'ZIndex'),
          children,
        }
        return node
      }
    }
    i++
  }
  return null
}

function findStartScreenItem() {
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('<string name="Name">StartScreen</string>')) continue
    // walk back to Item
    for (let j = i; j >= Math.max(0, i - 30); j--) {
      if (lines[j].includes('<Item class=')) return j
    }
  }
  return -1
}

function findChildByPath(root, pathParts) {
  let node = root
  for (const part of pathParts) {
    node = node.children.find((c) => c.name === part)
    if (!node) return null
  }
  return node
}

function flattenTree(node, ancestors = []) {
  const path = [...ancestors, node.name]
  const rows = [{ path: path.join('.'), node }]
  for (const child of node.children) {
    rows.push(...flattenTree(child, path))
  }
  return rows
}

function formatUdim2(u) {
  if (!u) return '?'
  return `{${u.xScale},${u.xOffset}},{${u.yScale},${u.yOffset}}`
}

function annotateRects(root) {
  const viewport = { x: 0, y: 0, w: VIEWPORT.w, h: VIEWPORT.h }
  const rects = new Map()

  function walk(node, parentRect, path) {
    const p = [...path, node.name]
    const key = p.join('.')
    const rect = computeRect(node, parentRect)
    rects.set(key, rect)
    for (const child of node.children) walk(child, rect, p)
  }

  // StartScreen is typically full viewport
  const ssRect = computeRect(root, viewport)
  rects.set(root.name, ssRect)
  for (const child of root.children) walk(child, ssRect, [root.name])
  return rects
}

const ssLine = findStartScreenItem()
if (ssLine < 0) {
  console.error('StartScreen not found')
  process.exit(1)
}

const startScreen = readItemAt(ssLine)
const rects = annotateRects(startScreen)

// Print focused paths
const focusPaths = [
  'StartScreen.StartMenu',
  'StartScreen.StartMenu.Top',
  'StartScreen.StartMenu.Main',
  'StartScreen.StartMenu.Main.L',
  'StartScreen.StartMenu.Main.R',
  'StartScreen.StartMenu.Version',
  'StartScreen.StartMenuRB',
  'StartScreen.StartMenuRB.MainButtons',
  'StartScreen.StartMenuRB.AboutButtons',
  'StartScreen.FrontPage',
  'StartScreen.PlayMenu',
]

// Discover R panel variants
const startMenu = findChildByPath(startScreen, ['StartMenu'])
const mainR = startMenu ? findChildByPath(startMenu, ['Main', 'R']) : null
if (mainR) {
  console.log('\n=== StartMenu.Main.R children ===')
  for (const c of mainR.children) {
    console.log(`  ${c.name} (${c.className}) Visible=${c.visible} Size=${formatUdim2(c.size)}`)
    for (const gc of c.children.slice(0, 12)) {
      console.log(`    └ ${gc.name} (${gc.className}) Visible=${gc.visible} Text=${JSON.stringify(gc.text ?? '')}`)
    }
  }
}

console.log(`\n=== StartScreen UI @ ${VIEWPORT.w}×${VIEWPORT.h} (computed AbsolutePosition) ===\n`)
console.log(
  'Path'.padEnd(55),
  'Class'.padEnd(14),
  'Visible',
  'Position'.padEnd(22),
  'Size'.padEnd(22),
  'Screen XYWH',
  'Content',
)

const allRows = flattenTree(startScreen)
const interesting = allRows.filter(({ path, node }) => {
  const p = path.toLowerCase()
  if (!p.includes('startmenu') && !p.includes('startmenurb') && !p.includes('frontpage')) return false
  if (node.className === 'UIListLayout' || node.className === 'UICorner' || node.className === 'UIPadding') {
    return p.split('.').length <= 6
  }
  return true
})

for (const { path, node } of interesting) {
  const depth = path.split('.').length - 2
  if (depth > 8) continue
  const rect = rects.get(path)
  const screen = rect ? `${rect.x},${rect.y} ${rect.w}×${rect.h}` : '?'
  const content = [node.text, node.image?.slice(0, 40)].filter(Boolean).join(' | ')
  console.log(
    path.padEnd(55),
    node.className.padEnd(14),
    String(node.visible ?? '?').padEnd(7),
    formatUdim2(node.position).padEnd(22),
    formatUdim2(node.size).padEnd(22),
    screen.padEnd(18),
    content.slice(0, 60),
  )
}

// TopBar - separate search under MainCtr
console.log('\n=== TopBar (MainCtr.RouteCtr.TopBar) ===')
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].includes('<string name="Name">TopBar</string>')) continue
  const ctx = lines.slice(Math.max(0, i - 40), i).join('\n')
  if (!ctx.includes('RouteCtr') && !ctx.includes('MainCtr')) continue
  for (let j = i; j >= Math.max(0, i - 30); j--) {
    if (lines[j].includes('<Item class=')) {
      const tb = readItemAt(j)
      if (!tb) break
      const tbRect = { x: 0, y: 0, w: VIEWPORT.w, h: VIEWPORT.h }
      // TopBar parent is likely full screen GUI
      const rect = computeRect(tb, tbRect)
      console.log(`TopBar Size=${formatUdim2(tb.size)} Position=${formatUdim2(tb.position)} ~screen ${rect.x},${rect.y} ${rect.w}×${rect.h}`)
      for (const c of tb.children) {
        const cr = computeRect(c, rect)
        console.log(
          `  ${c.name} (${c.className}) Visible=${c.visible} pos=${formatUdim2(c.position)} size=${formatUdim2(c.size)} screen=${cr.x},${cr.y} ${cr.w}×${cr.h} text=${JSON.stringify(c.text ?? '')}`,
        )
        for (const gc of c.children.slice(0, 8)) {
          if (gc.className.includes('Layout')) continue
          const gcr = computeRect(gc, cr)
          console.log(
            `    ${gc.name} (${gc.className}) Visible=${gc.visible} screen=${gcr.x},${gcr.y} ${gcr.w}×${gcr.h} text=${JSON.stringify(gc.text ?? '')}`,
          )
        }
      }
      break
    }
  }
  break
}
