const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'N472', 'C01', 'C401', '376', '476X', '476SA', 'U47', 'S1A', '160R', '170R',
      'F469A', '76S', '370', '475A', 'N476', 'F701', 'N76A', '246XA', '376S',
      '475P', '476P', '476#', 'C401A', 'S2A', 'U47*',
    ]
const base = 'https://sunshine-islands-roblox.fandom.com/api.php'

for (const id of ids) {
  const title = `Bus_route_${id}`
  const u = `${base}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json`
  try {
    const r = await fetch(u, { headers: { 'User-Agent': 'SIBSRouteLookup/1.0' } })
    const j = await r.json()
    if (j.error) {
      console.log(`${id}\tERR\t${j.error.info}`)
      continue
    }
    const wt = j.parse?.wikitext?.['*'] ?? ''
    const pick = (re) => (wt.match(re) || [])[1]?.trim()
    console.log(
      [
        id,
        pick(/operator\s*=\s*([^\n|]+)/i),
        pick(/zone\s*=\s*([^\n|]+)/i),
        pick(/start\s*=\s*([^\n|]+)/i),
        pick(/end\s*=\s*([^\n|]+)/i),
      ].join('\t'),
    )
  } catch (e) {
    console.log(`${id}\tFAIL\t${e.message}`)
  }
  await new Promise((r) => setTimeout(r, 350))
}
