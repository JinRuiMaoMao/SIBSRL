import dns from 'node:dns'
import nodemailer from 'nodemailer'

const DEFAULT_RESEND_FROM = 'SIBS Route Lookup <onboarding@resend.dev>'

function buildVerificationContent(code, purpose) {
  const subject =
    purpose === 'register'
      ? 'SIBS 线路查询 - 注册验证码'
      : 'SIBS 线路查询 - 重置密码验证码'
  const intro =
    purpose === 'register'
      ? '您正在注册 SIBS 线路查询账号。'
      : '您正在重置 SIBS 线路查询账号密码。'
  const text = `${intro}\n\n验证码：${code}\n\n10 分钟内有效。如非本人操作，请忽略此邮件。\n\n— SIBS Route Lookup`
  const html = `<p>${intro}</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>10 分钟内有效。如非本人操作，请忽略此邮件。</p><p>— SIBS Route Lookup</p>`
  return { subject, text, html }
}

function requireSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = process.env.MAIL_FROM?.trim() || user
  if (!host || !user || !pass) {
    throw new Error('Missing SMTP_HOST, SMTP_USER, or SMTP_PASS')
  }
  return { host, port, user, pass, from }
}

let transporter = null

function getTransporter() {
  if (!transporter) {
    const { host, port, user, pass } = requireSmtpConfig()
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 15_000,
      family: 4,
      lookup: (hostname, _options, callback) => {
        dns.lookup(hostname, { family: 4 }, callback)
      },
    })
  }
  return transporter
}

function parseMailFrom(from) {
  const trimmed = from.trim()
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  return { email: trimmed }
}

function getSendGridApiKey() {
  const explicit = process.env.SENDGRID_API_KEY?.trim()
  if (explicit) return explicit

  const pass = process.env.SMTP_PASS?.trim() ?? ''
  if (pass.startsWith('SG.')) return pass

  const host = process.env.SMTP_HOST?.trim().toLowerCase() ?? ''
  if (host.includes('sendgrid') && pass) return pass
  return null
}

/** @returns {'resend' | 'sendgrid' | 'smtp' | null} */
export function resolveMailProvider() {
  const forced = process.env.MAIL_PROVIDER?.trim().toLowerCase()
  if (forced === 'resend' && process.env.RESEND_API_KEY?.trim()) return 'resend'
  if (forced === 'sendgrid' && getSendGridApiKey()) return 'sendgrid'
  if (forced === 'smtp') {
    try {
      requireSmtpConfig()
      return 'smtp'
    } catch {
      return null
    }
  }

  if (process.env.RESEND_API_KEY?.trim()) return 'resend'
  if (getSendGridApiKey()) return 'sendgrid'
  try {
    requireSmtpConfig()
    return 'smtp'
  } catch {
    return null
  }
}

/** @param {{ to: string, subject: string, text: string, html: string, from: string }} params */
async function sendViaSendGrid({ to, subject, text, html, from }) {
  const apiKey = getSendGridApiKey()
  if (!apiKey) return false

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: parseMailFrom(from),
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`SendGrid failed (${res.status}): ${detail}`)
  }
  return true
}

/** @param {{ to: string, subject: string, text: string, html: string }} params */
async function sendViaResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return false

  const from = process.env.MAIL_FROM?.trim() || DEFAULT_RESEND_FROM
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Resend failed (${res.status}): ${detail}`)
  }
  return true
}

function assertMailProviderConfigured() {
  const provider = resolveMailProvider()
  if (!provider) {
    throw new Error(
      'No mail provider configured: set SENDGRID_API_KEY (recommended), RESEND_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS',
    )
  }
  return provider
}

/** @param {{ to: string, code: string, purpose: 'register' | 'reset' }} params */
export async function sendVerificationEmail({ to, code, purpose }) {
  const { subject, text, html } = buildVerificationContent(code, purpose)
  const provider = assertMailProviderConfigured()
  const from =
    process.env.MAIL_FROM?.trim() ||
    (provider === 'smtp' ? requireSmtpConfig().from : DEFAULT_RESEND_FROM)

  if (provider === 'resend') {
    await sendViaResend({ to, subject, text, html })
    return
  }

  if (provider === 'sendgrid') {
    console.info('[user-mail] sending via SendGrid HTTP API')
    await sendViaSendGrid({ to, subject, text, html, from })
    return
  }

  console.info('[user-mail] sending via SMTP')
  await getTransporter().sendMail({ from, to, subject, text, html })
}
