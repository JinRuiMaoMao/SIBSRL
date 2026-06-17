import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import {
  Client,
  GatewayIntentBits,
  Partials,
} from 'discord.js'
import {
  isSameDailyChallenge,
  parseDailyChallengeMessage,
} from './lib/daily-challenge-message.mjs'

const DEFAULT_STORE_PATH = 'data/daily-challenge-live.json'
const DEFAULT_HISTORY_LIMIT = 90
const DEFAULT_API_PORT = 8787

const args = new Set(process.argv.slice(2))
const apiOnly = args.has('--api-only')

const config = {
  token: process.env.DISCORD_TOKEN,
  channelId: process.env.DAILY_CHALLENGE_CHANNEL_ID,
  enaBotUserId: process.env.ENA_BOT_USER_ID,
  storePath: resolve(process.cwd(), process.env.DAILY_CHALLENGE_STORE_PATH ?? DEFAULT_STORE_PATH),
  historyLimit: Number(process.env.DAILY_CHALLENGE_HISTORY_LIMIT ?? DEFAULT_HISTORY_LIMIT),
  apiPort: Number(process.env.DAILY_CHALLENGE_API_PORT ?? DEFAULT_API_PORT),
  corsOrigin: process.env.DAILY_CHALLENGE_CORS_ORIGIN ?? '*',
}

function requireBotConfig() {
  const missing = []
  if (!config.token) missing.push('DISCORD_TOKEN')
  if (!config.channelId) missing.push('DAILY_CHALLENGE_CHANNEL_ID')
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`)
  }
}

function emptyStore() {
  return {
    schemaVersion: 1,
    updatedAt: null,
    latest: null,
    history: [],
  }
}

async function readStore() {
  try {
    const raw = await readFile(config.storePath, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      ...emptyStore(),
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    }
  } catch (error) {
    if (error.code === 'ENOENT') return emptyStore()
    throw error
  }
}

async function writeStore(store) {
  await mkdir(dirname(config.storePath), { recursive: true })
  const tmpPath = `${config.storePath}.tmp`
  await writeFile(tmpPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  await rename(tmpPath, config.storePath)
}

function dedupeHistory(records) {
  const seen = new Set()
  const unique = []
  for (const record of records) {
    const key = record.source?.messageId ?? record.contentHash
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(record)
  }
  return unique.slice(0, Math.max(1, config.historyLimit))
}

async function upsertDailyChallenge(record) {
  const store = await readStore()
  if (isSameDailyChallenge(store.latest, record)) {
    return { changed: false, store }
  }

  const nextStore = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    latest: record,
    history: dedupeHistory([record, store.latest, ...store.history].filter(Boolean)),
  }

  await writeStore(nextStore)
  return { changed: true, store: nextStore }
}

function sendJson(res, statusCode, body, corsOrigin = config.corsOrigin) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(`${JSON.stringify(body, null, 2)}\n`)
}

function startApiServer() {
  const server = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {})
      return
    }

    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' })
      return
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    try {
      if (url.pathname === '/healthz') {
        sendJson(res, 200, { ok: true })
        return
      }

      const store = await readStore()
      if (url.pathname === '/api/daily-challenge/latest') {
        sendJson(res, 200, {
          ok: true,
          updatedAt: store.updatedAt,
          latest: store.latest,
        })
        return
      }

      if (url.pathname === '/api/daily-challenge/history') {
        sendJson(res, 200, {
          ok: true,
          updatedAt: store.updatedAt,
          latest: store.latest,
          history: store.history,
        })
        return
      }

      sendJson(res, 404, { ok: false, error: 'Not found' })
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message })
    }
  })

  server.listen(config.apiPort, () => {
    console.log(`[daily-bot] API listening on http://localhost:${config.apiPort}`)
  })

  return server
}

function shouldHandleMessage(message) {
  if (message.channelId !== config.channelId) return false
  if (config.enaBotUserId) return message.author?.id === config.enaBotUserId
  return Boolean(message.author?.bot)
}

async function handleMessage(message) {
  if (message.partial) {
    message = await message.fetch()
  }
  if (!shouldHandleMessage(message)) return

  const record = parseDailyChallengeMessage(message)
  if (!record) return

  const { changed } = await upsertDailyChallenge(record)
  const status = changed ? 'stored' : 'duplicate'
  console.log(
    `[daily-bot] ${status}: ${record.date} ${record.event} ${record.routeCode} (${record.source.messageId})`,
  )
}

async function startDiscordBot() {
  requireBotConfig()

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  })

  client.once('ready', () => {
    console.log(`[daily-bot] logged in as ${client.user?.tag}`)
    console.log(`[daily-bot] watching channel ${config.channelId}`)
  })

  client.on('messageCreate', (message) => {
    void handleMessage(message).catch((error) => {
      console.error('[daily-bot] messageCreate failed:', error)
    })
  })

  client.on('messageUpdate', (_oldMessage, newMessage) => {
    void handleMessage(newMessage).catch((error) => {
      console.error('[daily-bot] messageUpdate failed:', error)
    })
  })

  await client.login(config.token)
}

startApiServer()

if (apiOnly) {
  console.log('[daily-bot] running in API-only mode')
} else {
  void startDiscordBot().catch((error) => {
    console.error('[daily-bot] startup failed:', error.message)
    process.exitCode = 1
  })
}
