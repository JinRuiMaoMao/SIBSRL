/**
 * Extract Profile/MainCtr UI tree @ 1920×1080.
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
          anchor: parseVector2(propsBlock, 'AnchorPoint'),
          position: parseUdim2(propsBlock, 'Position') ?? { xScale: 0, xOffset: 0, yScale: 0, yOffset: 0 },
          size: parseUdim2(propsBlock, 'Size') ?? { xScale: 1, xOffset: 0, yScale: 1, yOffset: 0 },
          visible: parseScalar(propsBlock, 'bool', 'Visible'),
          backgroundTransparency: parseScalar(propsBlock, 'float', 'BackgroundTransparency'),
          backgroundColor3: parseColor3(propsBlock, 'BackgroundColor3'),
          text: parseScalar(propsBlock, 'string', 'Text'),
          textColor3: parseColor3(propsBlock, 'TextColor3'),
          textSize: parseScalar(propsBlock, 'int', 'TextSize'),
          font: parseScalar(propsBlock, 'token', 'Font'),
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
    for (let j = i; j >= Math.max(0, i - 30); j--) {
      if (lines[j].includes('<Item class=')) return j
    }
  }
  return -1
}

function findChildByName(node, name) {
  if (node.name === name) return node
  for (const child of node.children) {
    const hit = findChildByName(child, name)
    if (hit) return hit
  }
  return null
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

  const ssRect = computeRect(root, viewport)
  rects.set(root.name, ssRect)
  for (const child of root.children) walk(child, ssRect, [root.name])
  return rects
}

function pct(n, d) {
  return `${((n / d) * 100).toFixed(1)}%`
}

const ssLine = findStartScreenItem()
if (ssLine < 0) {
  console.error('StartScreen not found')
  process.exit(1)
}

const startScreen = readItemAt(ssLine)
const profileNode = findChildByName(startScreen, 'Profile')
if (!profileNode) {
  console.error('Profile not found under StartScreen')
  process.exit(1)
}

// Re-read Profile subtree from file for complete tree
function findProfileItemLine() {
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('<string name="Name">Profile</string>')) continue
    for (let j = i; j >= Math.max(0, i - 30); j--) {
      if (lines[j].includes('<Item class="Frame"')) {
        const probe = readItemAt(j)
        if (probe?.name === 'Profile' && probe.children.some((c) => c.name === 'MainCtr')) return j
      }
    }
  }
  return -1
}

const pl = findProfileItemLine()
const profile = readItemAt(pl)
const rects = annotateRects(profile)
const profileRect = rects.get('Profile')
const mainCtrRect = rects.get('Profile.MainCtr')

console.log(`Profile screen: ${profileRect.x},${profileRect.y} ${profileRect.w}×${profileRect.h}`)
console.log(`MainCtr screen: ${mainCtrRect.x},${mainCtrRect.y} ${mainCtrRect.w}×${mainCtrRect.h}\n`)

console.log('=== Profile hierarchy (Top + MainCtr) @ 1920×1080 ===\n')
const allRows = flattenTree(profile)
const skipLayout = new Set(['UIListLayout', 'UICorner', 'UIPadding', 'UIGradient', 'UIStroke', 'UITextSizeConstraint', 'UIAspectRatioConstraint'])

for (const { path, node } of allRows) {
  if (!path.startsWith('Profile.')) continue
  const depth = path.split('.').length
  if (depth > 8) continue
  if (skipLayout.has(node.className) && depth > 4) continue

  const rect = rects.get(path)
  const relMain = mainCtrRect && rect
    ? `${rect.x - mainCtrRect.x},${rect.y - mainCtrRect.y} ${rect.w}×${rect.h} (${pct(rect.w, mainCtrRect.w)}×${pct(rect.h, mainCtrRect.h)} of MainCtr)`
    : '?'

  const extras = [
    node.text,
    node.backgroundColor3,
    node.backgroundTransparency !== null ? `bgT=${node.backgroundTransparency}` : '',
    node.textColor3,
    node.textSize ? `sz${node.textSize}` : '',
    node.font ? `font${node.font}` : '',
    node.image?.includes('id=') ? node.image.match(/id=(\d+)/)?.[1] : '',
  ]
    .filter(Boolean)
    .join(' | ')

  console.log(
    path.padEnd(55),
    node.className.padEnd(14),
    formatUdim2(node.size).padEnd(22),
    (rect ? `${rect.x},${rect.y} ${rect.w}×${rect.h}` : '?').padEnd(18),
    relMain.slice(0, 45),
    extras.slice(0, 70),
  )
}

// BtnCtr tabs
const btnCtr = findChildByPath(profile, ['MainCtr', 'BtnCtr'])
if (btnCtr) {
  console.log('\n=== BtnCtr tab buttons ===')
  for (const c of btnCtr.children) {
    if (c.className.includes('Layout')) continue
    const p = `Profile.MainCtr.BtnCtr.${c.name}`
    const r = rects.get(p)
    console.log(
      c.name,
      c.className,
      formatUdim2(c.size),
      r ? `${r.w}×${r.h} @ ${r.x},${r.y}` : '?',
      c.text ?? '',
    )
  }
}

// Stats / License under MainCtr
const statsPaths = allRows.filter(({ path }) =>
  /MainCtr\.(Stats|License|Chalk|Board|Content|BtnCtr|Top)/i.test(path) ||
  path.includes('MainCtr.Stats') ||
  path.includes('MainCtr.License') ||
  path.includes('MainCtr.Chalkboard') ||
  path.includes('MainCtr.Board'),
)

if (statsPaths.length) {
  console.log('\n=== Stats/License nodes ===')
  for (const { path, node } of statsPaths) {
    const r = rects.get(path)
    console.log(path, node.className, r ? `${r.x},${r.y} ${r.w}×${r.h}` : '?', node.text ?? '')
  }
}
