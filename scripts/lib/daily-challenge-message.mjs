import { createHash } from 'node:crypto'

const GAME_DAY_OFFSET_MS = 8 * 60 * 60 * 1000

const LABELS = {
  route: ['route', 'route code', '路线', '線路', '线路'],
  type: ['type', 'challenge type', 'event', '类型', '類型'],
  rtInfoBoard: ['rtinfoboard', 'rt info board', 'rt info', 'info board'],
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim()
}

function stripMarkdown(value) {
  return normalizeWhitespace(value)
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^[-•]\s*/, '')
    .trim()
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function labelPattern(labels) {
  return labels.map(escapeRegExp).join('|')
}

function getEmbedFields(message) {
  const fields = []
  for (const embed of message.embeds ?? []) {
    const rawFields = embed.fields ?? embed.data?.fields ?? []
    for (const field of rawFields) {
      if (!field) continue
      fields.push({
        name: stripMarkdown(field.name),
        value: stripMarkdown(field.value),
      })
    }
  }
  return fields
}

function getEmbedTextParts(message) {
  const parts = []
  for (const embed of message.embeds ?? []) {
    const data = embed.data ?? embed
    const authorName = data.author?.name ?? embed.author?.name
    const footerText = data.footer?.text ?? embed.footer?.text
    parts.push(
      data.title,
      embed.title,
      data.description,
      embed.description,
      authorName,
      footerText,
      data.url,
      embed.url,
    )

    for (const field of getEmbedFields({ embeds: [embed] })) {
      parts.push(`${field.name}: ${field.value}`)
    }
  }
  return parts.filter(Boolean).map(stripMarkdown)
}

export function getDailyChallengeGameDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong' }).format(
    new Date(date.getTime() - GAME_DAY_OFFSET_MS),
  )
}

export function extractDiscordMessageText(message) {
  return [message.content, ...getEmbedTextParts(message)]
    .filter(Boolean)
    .map(stripMarkdown)
    .join('\n')
    .trim()
}

function valueFromFields(fields, labels) {
  const wanted = new RegExp(`^(?:${labelPattern(labels)})$`, 'i')
  const field = fields.find((item) => wanted.test(stripMarkdown(item.name)))
  return field?.value ? stripMarkdown(field.value) : null
}

function valueFromText(text, labels) {
  const label = labelPattern(labels)
  const patterns = [
    new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:：-]\\s*([^\\n]+)`, 'i'),
    new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*\\n\\s*([^\\n]+)`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return stripMarkdown(match[1])
  }

  return null
}

function extractLabelValue(message, text, key) {
  return valueFromFields(getEmbedFields(message), LABELS[key]) ?? valueFromText(text, LABELS[key])
}

function normalizeRouteCode(value) {
  const cleaned = stripMarkdown(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .trim()
  const match = cleaned.match(/\b(?:PH\d+|[A-Z]{0,2}\d{1,3}[A-Z0-9#*%_-]*)\b/i)
  return match ? match[0].toUpperCase() : cleaned.toUpperCase()
}

function normalizeType(value) {
  const cleaned = stripMarkdown(value)
  const race = /\[?\s*race\s*\]?/i.test(cleaned)
  const event = cleaned
    .replace(/\[?\s*race\s*\]?/gi, '')
    .replace(/^daily\s+challenge\s*[:：-]?\s*/i, '')
    .trim()
  return {
    event: event || 'Daily Challenge',
    race,
  }
}

function normalizeRtInfoBoard(value) {
  if (!value) return null
  const cleaned = stripMarkdown(value)
  return cleaned && !/^none|null|n\/a|-$/i.test(cleaned) ? cleaned : null
}

function buildContentHash(record) {
  const stable = JSON.stringify({
    date: record.date,
    event: record.event,
    routeCode: record.routeCode,
    race: record.race,
    rtInfoBoard: record.rtInfoBoard,
  })
  return createHash('sha256').update(stable).digest('hex')
}

export function parseDailyChallengeMessage(message, now = new Date()) {
  const text = extractDiscordMessageText(message)
  if (!text) return null

  const routeValue = extractLabelValue(message, text, 'route')
  const typeValue = extractLabelValue(message, text, 'type')
  const rtInfoBoard = normalizeRtInfoBoard(extractLabelValue(message, text, 'rtInfoBoard'))

  if (!routeValue || !typeValue) return null

  const { event, race } = normalizeType(typeValue)
  const createdAt = message.createdAt instanceof Date ? message.createdAt : now
  const record = {
    schemaVersion: 1,
    date: getDailyChallengeGameDate(createdAt),
    event,
    routeCode: normalizeRouteCode(routeValue),
    race,
    rtInfoBoard,
    updatedAt: now.toISOString(),
    source: {
      messageId: message.id ?? null,
      channelId: message.channelId ?? message.channel?.id ?? null,
      authorId: message.author?.id ?? null,
      authorTag: message.author?.tag ?? message.author?.username ?? null,
      receivedAt: createdAt.toISOString(),
    },
    rawText: text,
  }

  return {
    ...record,
    contentHash: buildContentHash(record),
  }
}

export function isSameDailyChallenge(a, b) {
  if (!a || !b) return false
  if (a.source?.messageId && a.source.messageId === b.source?.messageId) return true
  return (
    a.contentHash === b.contentHash ||
    (a.date === b.date &&
      a.event === b.event &&
      a.routeCode === b.routeCode &&
      Boolean(a.race) === Boolean(b.race) &&
      (a.rtInfoBoard ?? null) === (b.rtInfoBoard ?? null))
  )
}
