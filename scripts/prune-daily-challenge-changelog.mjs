import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const filePath = resolve('src/data/versionUpdates.ts')

/** Remove changelog items that announce daily-challenge schedule/data updates. */
function shouldRemoveDailyChallengeSync(zh, en) {
  const text = `${zh}\n${en}`
  const patterns = [
    /同步\s+[\d/–-]+.*每日挑战/,
    /Synced\s+[\d/–-]+.*daily challenge/i,
    /录入\s+\d+\/\d+.*私人租用/,
    /批量录入私人租用/,
    /更正\s+(\d+\/\d+|20\d{2}-).*每日挑战/,
    /更正\s+20\d{2}-.*占位「每日挑战/,
    /Corrected\s+\d+\/\d+\s+daily challenge/i,
    /Corrected\s+20\d{2}-.*placeholder Daily Challenge/i,
    /重刷.*Daily Challenge/,
    /Refreshed the full .* community schedule from Discord/i,
    /新增\s+20\d{2}.*每日挑战占位/,
    /Added placeholder daily challenge/i,
    /更新\s+\d+\/\d+\s+每日挑战/,
    /Updated the\s+\d+\/\d+\s+Daily Challenge/i,
    /加入 NamuWiki.*Daily Challenge/,
    /Added historical .* Daily Challenge calendars/i,
    /继续补入公开.*Daily Challenge/,
    /加入用户提供的\s+20\d{2}.*Daily Challenge 完整日历/,
    /Added the user-provided full .* Daily Challenge calendar/i,
    /Added and completed the user-provided .* Daily Challenge calendar/i,
    /Imported the user-provided Discord PDF history.*Daily Challenge/i,
    /导入用户提供的 Discord PDF 历史日程.*Daily Challenge/,
    /同步社区\s+\d+\s+月日程/,
    /Synced June community schedule/i,
    /按 Discord.*更新\s+\d+\s+月日程/,
    /Updated June schedule from Discord/i,
    /新增\s+20\d{2}\s+年\s+\d+\s+月社区日程/,
    /Added July 2026 community schedule/i,
    /Added \w+ 2026 community schedule.*Daily Challenge/i,
    /修正\s+6\/\d+：.*马拉松/,
    /Corrected 6\/\d+ to Marathon/i,
    /新增 2026 年 7 月社区日程与日历年／月切换/,
  ]

  return patterns.some((pattern) => pattern.test(text))
}

const itemBlockRe =
  /\n(\s+)\{\s*\n\s+zh:\s*"((?:\\.|[^"\\])*)",\s*\n\s+en:\s*"((?:\\.|[^"\\])*)",\s*\n\s+\},/g

function decodeJsString(value) {
  return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

let source = await readFile(filePath, 'utf8')
const beforeLength = source.length
let removed = 0

source = source.replace(itemBlockRe, (match, _indent, zhRaw, enRaw) => {
  const zh = decodeJsString(zhRaw)
  const en = decodeJsString(enRaw)
  if (!shouldRemoveDailyChallengeSync(zh, en)) return match
  removed += 1
  return ''
})

const emptyDailyGroupPatterns = [
  /\n      \{\r?\n        title: \{\r?\n          zh: "每日挑战",\r?\n          en: "Daily challenge",\r?\n        \},\r?\n        additions:\s*\[\s*\],\r?\n      \},/g,
  /\n      \{\r?\n        title: \{\r?\n          zh: "每日挑战",\r?\n          en: "Daily Challenge",\r?\n        \},\r?\n        additions:\s*\[\s*\],\r?\n      \},/g,
  /\n      \{\r?\n        title:\s+\{\r?\n          zh: "每日挑战",\r?\n          en: "Daily challenge",\r?\n        \},\r?\n        additions:\s*\[\s*\],\r?\n      \},/g,
  /\n      \{\r?\n        title:\s+\{\r?\n          zh: "每日挑战",\r?\n          en: "Daily Challenge",\r?\n        \},\r?\n        additions:\s*\[\s*\],\r?\n      \},/g,
  /\n      \{\r?\n        title: \{\r?\n          zh: "每日挑战",\r?\n          en: "Daily challenge",\r?\n        \},\r?\n        additions:\s*\[\s*\],\r?\n        fixes:\s*\[\s*\],\r?\n      \},/g,
  /\n      \{\r?\n        title:\s+\{\r?\n          zh: "每日挑战",\r?\n          en: "Daily challenge",\r?\n        \},\r?\n        additions:\s*\[\s*\],\r?\n        fixes:\s*\[\s*\],\r?\n      \},/g,
]

let emptyGroupsRemoved = 0
for (const pattern of emptyDailyGroupPatterns) {
  source = source.replace(pattern, () => {
    emptyGroupsRemoved += 1
    return ''
  })
}

await writeFile(filePath, source, 'utf8')
console.log(`Removed ${removed} daily-challenge sync changelog item(s).`)
console.log(`Removed ${emptyGroupsRemoved} empty daily-challenge group(s).`)
console.log(`Size: ${beforeLength} -> ${source.length}`)
