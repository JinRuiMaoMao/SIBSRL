/**
 * Scan NEW.rbxlx for FriendBoost / HUD-adjacent names (reference extract).
 * Full TopHud is script-built in-game; web uses src/data/realTopHudLayout.ts.
 */
import fs from 'node:fs'

const RBXLX =
  'C:/Users/Jinrui/Desktop/place 1588965415 Sunshine Islands Bus Simulator NEW.rbxlx'

console.log('reading...')
const text = fs.readFileSync(RBXLX, 'utf8')
for (const n of ['FriendBoost', 'Sunshards', 'DailyTask', 'Invite', 'Achievement']) {
  const count = (text.match(new RegExp(`<string name="Name">${n}</string>`, 'g')) || []).length
  console.log(`${n}: ${count}`)
}
console.log('See src/data/realTopHudLayout.ts for web shell proportions.')
