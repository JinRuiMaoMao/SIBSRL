import fs from 'node:fs'

const lines = fs
  .readFileSync('C:/Users/Jinrui/Desktop/place 1588965415 Sunshine Islands Bus Simulator NEW.rbxlx', 'utf8')
  .split(/\r?\n/)

const targets = new Set([
  'PlayMenu',
  'MainCtr',
  'PlayCtrBtn',
  'AboutButtons',
  'ComingEvent',
  'TopBar',
  'PlayBtn',
  'ProfileBtn',
  'ServerList',
  'Language',
  'Shop',
  'Music',
  'FAQ',
  'About',
  'Credit',
  'UIListLayout',
  'UIGridLayout',
  'UIPageLayout',
  'Logo',
  'Title',
  'Version',
])

const path = []
const results = []

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i]
  const open = line.match(/<Item class="([^"]+)" referent=/)
  if (open) {
    path.push(open[1])
    continue
  }
  if (line.includes('</Item>')) {
    path.pop()
    continue
  }

  const nameM = line.match(/<string name="Name">([^<]+)<\/string>/)
  if (!nameM) continue
  const name = nameM[1]
  if (!targets.has(name) && !name.endsWith('Btn')) continue

  const ctx = path.slice(-8).join('/')
  if (!ctx.includes('StartScreen') && !ctx.includes('PlayMenu') && name !== 'TopBar') continue

  let pos = ''
  let size = ''
  let layoutOrder = ''
  let anchor = ''
  let text = ''
  let fillDirection = ''
  let padding = ''

  for (let j = i; j < Math.min(i + 100, lines.length); j += 1) {
    if (lines[j].includes('</Properties>')) break
    if (lines[j].includes('<UDim2 name="Position"')) {
      const block = lines.slice(j, j + 6).join(' ')
      const xs = block.match(/<XS>([^<]+)<\/XS>/)?.[1] ?? '0'
      const xo = block.match(/<XO>([^<]+)<\/XO>/)?.[1] ?? '0'
      const ys = block.match(/<YS>([^<]+)<\/YS>/)?.[1] ?? '0'
      const yo = block.match(/<YO>([^<]+)<\/YO>/)?.[1] ?? '0'
      pos = `${xs},${xo},${ys},${yo}`
    }
    if (lines[j].includes('<UDim2 name="Size"')) {
      const block = lines.slice(j, j + 6).join(' ')
      const xs = block.match(/<XS>([^<]+)<\/XS>/)?.[1] ?? '0'
      const xo = block.match(/<XO>([^<]+)<\/XO>/)?.[1] ?? '0'
      const ys = block.match(/<YS>([^<]+)<\/YS>/)?.[1] ?? '0'
      const yo = block.match(/<YO>([^<]+)<\/YO>/)?.[1] ?? '0'
      size = `${xs},${xo},${ys},${yo}`
    }
    if (lines[j].includes('<int name="LayoutOrder"')) {
      layoutOrder = lines[j].match(/>([^<]+)</)?.[1] ?? ''
    }
    if (lines[j].includes('<Vector2 name="AnchorPoint"')) {
      const block = lines.slice(j, j + 4).join(' ')
      anchor = `${block.match(/<X>([^<]+)<\/X>/)?.[1]},${block.match(/<Y>([^<]+)<\/Y>/)?.[1]}`
    }
    if (lines[j].includes('<string name="Text"')) {
      text = lines[j].match(/>([^<]*)</)?.[1] ?? ''
    }
    if (lines[j].includes('<token name="FillDirection"')) {
      fillDirection = lines[j].match(/>([^<]+)</)?.[1] ?? ''
    }
    if (lines[j].includes('<UDim name="Padding')) {
      padding = lines[j]
    }
  }

  results.push({ line: i + 1, name, ctx, pos, size, layoutOrder, anchor, text, fillDirection })
}

for (const row of results) {
  console.log(
    [
      row.name.padEnd(16),
      `L${row.layoutOrder || '-'.padStart(2)}`,
      `pos ${row.pos || '?'}`,
      `size ${row.size || '?'}`,
      `anchor ${row.anchor || '?'}`,
      row.text ? `text=${JSON.stringify(row.text)}` : '',
      row.ctx.split('/').slice(-3).join('/'),
    ]
      .filter(Boolean)
      .join(' | '),
  )
}

console.log('\nTotal:', results.length)
