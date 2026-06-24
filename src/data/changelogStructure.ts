import type { BilingualText } from '../types/route'

/** 单日更新下的小标题分组；其内再分「新增」与「Bug 修复」。 */
export interface VersionUpdateGroup {
  title: BilingualText
  additions?: BilingualText[]
  fixes?: BilingualText[]
  /** @deprecated 旧版扁平列表（无新增/修复分层时仍可读） */
  items?: BilingualText[]
}

export interface VersionUpdateEntry {
  id: string
  date: string
  title: BilingualText
  items?: BilingualText[]
  groups?: VersionUpdateGroup[]
  easterEgg?: boolean
  easterEggTitle?: BilingualText
  easterEggHex?: string
}

export const CHANGELOG_ADDITIONS_TITLE: BilingualText = { zh: '新增', en: 'New' }
export const CHANGELOG_FIXES_TITLE: BilingualText = { zh: 'Bug 修复', en: 'Bug fixes' }

export interface ChangelogItemCounts {
  additions: number
  fixes: number
}

function addItemCounts(
  target: ChangelogItemCounts,
  items: BilingualText[] | undefined,
  bucket?: 'additions' | 'fixes',
): void {
  if (!items?.length) return
  if (bucket) {
    target[bucket] += items.length
    return
  }
  for (const item of items) {
    target[classifyChangelogItem(item)] += 1
  }
}

export function countChangelogGroup(group: VersionUpdateGroup): ChangelogItemCounts {
  const counts: ChangelogItemCounts = { additions: 0, fixes: 0 }
  addItemCounts(counts, group.additions, 'additions')
  addItemCounts(counts, group.fixes, 'fixes')
  addItemCounts(counts, group.items)
  return counts
}

export function countChangelogEntry(entry: VersionUpdateEntry): ChangelogItemCounts {
  const counts: ChangelogItemCounts = { additions: 0, fixes: 0 }
  if (entry.groups?.length) {
    for (const group of entry.groups) {
      const groupCounts = countChangelogGroup(group)
      counts.additions += groupCounts.additions
      counts.fixes += groupCounts.fixes
    }
    return counts
  }
  addItemCounts(counts, entry.items)
  return counts
}

export function countChangelogEntries(entries: VersionUpdateEntry[]): ChangelogItemCounts {
  return entries.reduce<ChangelogItemCounts>(
    (totals, entry) => {
      const entryCounts = countChangelogEntry(entry)
      totals.additions += entryCounts.additions
      totals.fixes += entryCounts.fixes
      return totals
    },
    { additions: 0, fixes: 0 },
  )
}

/** 将旧版扁平条目自动归入「新增」或「Bug 修复」。 */
export function classifyChangelogItem(item: BilingualText): 'additions' | 'fixes' {
  const zh = item.zh.trim()
  const en = item.en.trim()

  if (
    /^(修复|修正|纠正|一并修复|重新提取并修复|补修)/.test(zh) ||
    /^(Fixed|Fix |Corrected|Also fixed|Resolved|Re-extracted and fixed)/i.test(en)
  ) {
    return 'fixes'
  }

  if (/清除.*乱码|伪站名|误解析/.test(zh) || /gibberish|pseudo-stop/i.test(en)) {
    return 'fixes'
  }

  return 'additions'
}

export function normalizeChangelogGroup(group: VersionUpdateGroup): VersionUpdateGroup {
  if ((group.additions?.length ?? 0) > 0 || (group.fixes?.length ?? 0) > 0) {
    return {
      title: group.title,
      additions: group.additions?.length ? [...group.additions] : undefined,
      fixes: group.fixes?.length ? [...group.fixes] : undefined,
    }
  }

  if (!group.items?.length) {
    return { title: group.title }
  }

  const additions: BilingualText[] = []
  const fixes: BilingualText[] = []
  for (const item of group.items) {
    ;(classifyChangelogItem(item) === 'fixes' ? fixes : additions).push(item)
  }

  return {
    title: group.title,
    additions: additions.length ? additions : undefined,
    fixes: fixes.length ? fixes : undefined,
  }
}

export function normalizeChangelogEntry(entry: VersionUpdateEntry): VersionUpdateEntry {
  if (entry.groups?.length) {
    return {
      ...entry,
      items: undefined,
      groups: entry.groups.map(normalizeChangelogGroup),
    }
  }

  if (!entry.items?.length) {
    return { ...entry, items: undefined }
  }

  const additions: BilingualText[] = []
  const fixes: BilingualText[] = []
  for (const item of entry.items) {
    ;(classifyChangelogItem(item) === 'fixes' ? fixes : additions).push(item)
  }

  return {
    ...entry,
    items: undefined,
    groups: [
      {
        title: { zh: '综合', en: 'General' },
        additions: additions.length ? additions : undefined,
        fixes: fixes.length ? fixes : undefined,
      },
    ],
  }
}

function formatBilingual(item: BilingualText, itemIndent: string): string {
  return `${itemIndent}{\n${itemIndent}  zh: ${JSON.stringify(item.zh)},\n${itemIndent}  en: ${JSON.stringify(item.en)},\n${itemIndent}}`
}

function serializeItems(items: BilingualText[] | undefined, blockIndent: string): string | null {
  if (!items?.length) return null
  const itemIndent = `${blockIndent}  `
  return `${blockIndent}[\n${items.map((item) => `${itemIndent}${formatBilingual(item, itemIndent)},`).join('\n')}\n${blockIndent}]`
}

function serializeGroup(group: VersionUpdateGroup, indent: string): string {
  const blockIndent = `${indent}  `
  const parts = [`${indent}{`, `${blockIndent}title: ${formatBilingual(group.title, blockIndent)},`]

  const additions = serializeItems(group.additions, blockIndent)
  if (additions) parts.push(`${blockIndent}additions: ${additions},`)

  const fixes = serializeItems(group.fixes, blockIndent)
  if (fixes) parts.push(`${blockIndent}fixes: ${fixes},`)

  parts.push(`${indent}}`)
  return parts.join('\n')
}

function serializeEntry(entry: VersionUpdateEntry, indent: string): string {
  const blockIndent = `${indent}  `
  const parts = [
    `${indent}{`,
    `${blockIndent}id: ${JSON.stringify(entry.id)},`,
    `${blockIndent}date: ${JSON.stringify(entry.date)},`,
    `${blockIndent}title: ${formatBilingual(entry.title, blockIndent)},`,
  ]

  if (entry.groups?.length) {
    parts.push(
      `${blockIndent}groups: [`,
      ...entry.groups.map((group) => `${serializeGroup(group, `${blockIndent}  `)},`),
      `${blockIndent}],`,
    )
  }

  if (entry.easterEgg) parts.push(`${blockIndent}easterEgg: true,`)
  if (entry.easterEggTitle) {
    parts.push(`${blockIndent}easterEggTitle: ${formatBilingual(entry.easterEggTitle, blockIndent)},`)
  }
  if (entry.easterEggHex) parts.push(`${blockIndent}easterEggHex: ${JSON.stringify(entry.easterEggHex)},`)

  parts.push(`${indent}}`)
  return parts.join('\n')
}

/** 将规范化后的条目序列化为 versionUpdatesRaw 数组源码。 */
export function serializeVersionUpdatesRaw(entries: VersionUpdateEntry[]): string {
  const body = entries.map((entry) => serializeEntry(entry, '  ')).join(',\n')
  return `const versionUpdatesRaw: VersionUpdateEntry[] = [\n  // 新改动追加到此条目（date = CURRENT_CHANGELOG_DATE）；无内容时不展示。\n${body},\n]`
}
