import dns from 'node:dns'
import nodemailer from 'nodemailer'

const DEFAULT_RESEND_FROM = 'SIBS Route Lookup <onboarding@resend.dev>'
const DEFAULT_SITE_URL = 'https://jinruimaomao.github.io/SIBSRL/'
const DEFAULT_ACCOUNT_URL = 'https://jinruimaomao.github.io/SIBSRL/account.html'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function getSiteUrls() {
  const accountUrl =
    process.env.MAIL_ACCOUNT_URL?.trim() ||
    process.env.OAUTH_FRONTEND_URL?.trim() ||
    DEFAULT_ACCOUNT_URL
  const siteUrl =
    process.env.MAIL_SITE_URL?.trim() ||
    accountUrl.replace(/\/account\.html$/i, '/').replace(/\/?$/, '/')
  return { siteUrl, accountUrl }
}

function buildVerificationContent(code, purpose) {
  const { siteUrl, accountUrl } = getSiteUrls()
  const safeCode = escapeHtml(code)

  const copy =
    purpose === 'register'
      ? {
          subject: '请完成 SIBS Route Lookup 账号注册',
          preheader: `您的注册确认码为 ${code}，10 分钟内有效。`,
          headline: '确认您的账号注册',
          intro:
            '您正在使用邮箱注册 SIBS Route Lookup（SIBS 线路查询）账号。请在注册页面输入下方确认码以完成验证。',
          action: '完成注册',
        }
      : {
          subject: 'SIBS Route Lookup 密码重置请求',
          preheader: `您的密码重置确认码为 ${code}，10 分钟内有效。`,
          headline: '确认密码重置',
          intro:
            '我们收到了重置您 SIBS Route Lookup（SIBS 线路查询）账号密码的请求。请在重置页面输入下方确认码以继续。',
          action: '重置密码',
        }

  const text = [
    'SIBS Route Lookup',
    '',
    copy.headline,
    '',
    copy.intro,
    '',
    `确认码：${code}`,
    '',
    '该确认码 10 分钟内有效。请勿将确认码告知他人。',
    '',
    '如非本人操作，请忽略此邮件，您的账号不会因此变更。',
    '',
    `访问应用：${siteUrl}`,
    `账号页面：${accountUrl}`,
    '',
    '— SIBS Route Lookup',
    '此邮件由系统自动发送，请勿直接回复。',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(copy.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 12px;border-bottom:1px solid #eef2f7;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;letter-spacing:0.02em;">SIBS Route Lookup</p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.35;font-weight:700;color:#111827;">${escapeHtml(copy.headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(copy.intro)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;background-color:#f8fafc;border:1px solid #dbe3ee;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6b7280;">您的确认码</p>
                    <p style="margin:0;font-size:32px;line-height:1.2;font-weight:700;letter-spacing:0.28em;color:#111827;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">${safeCode}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#4b5563;">该确认码 <strong style="color:#111827;">10 分钟内有效</strong>。请勿将确认码告知他人。</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4b5563;">如非本人操作，请忽略此邮件，您的账号不会因此变更。</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#2563eb;">
                    <a href="${escapeHtml(accountUrl)}" style="display:inline-block;padding:12px 18px;font-size:14px;line-height:1.4;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(copy.action)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #eef2f7;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6b7280;">
                应用主页：<a href="${escapeHtml(siteUrl)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(siteUrl)}</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">此邮件由 SIBS Route Lookup 系统自动发送，请勿直接回复。</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return {
    subject: copy.subject,
    preheader: copy.preheader,
    text,
    html,
    category: purpose === 'register' ? 'account-register' : 'password-reset',
  }
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

/** @param {{ to: string, subject: string, text: string, html: string, from: string, category?: string, preheader?: string }} params */
async function sendViaSendGrid({ to, subject, text, html, from, category, preheader }) {
  const apiKey = getSendGridApiKey()
  if (!apiKey) return false

  const fromParsed = parseMailFrom(from)
  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: fromParsed,
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html },
    ],
    categories: [category ?? 'verification', 'transactional'],
    headers: {
      'X-Entity-Ref-ID': `sibs-${category ?? 'verification'}`,
    },
  }

  if (preheader) {
    payload.headers['X-Preheader'] = preheader
  }

  if (fromParsed.email) {
    payload.reply_to = { email: fromParsed.email, name: fromParsed.name }
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`SendGrid failed (${res.status}): ${detail}`)
  }
  return true
}

/** @param {{ to: string, subject: string, text: string, html: string, headers?: Record<string, string> }} params */
async function sendViaResend({ to, subject, text, html, headers }) {
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
      headers,
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
  const { subject, text, html, category, preheader } = buildVerificationContent(code, purpose)
  const provider = assertMailProviderConfigured()
  const from =
    process.env.MAIL_FROM?.trim() ||
    (provider === 'smtp' ? requireSmtpConfig().from : DEFAULT_RESEND_FROM)

  if (provider === 'resend') {
    await sendViaResend({
      to,
      subject,
      text,
      html,
      headers: preheader ? { 'X-Preheader': preheader } : undefined,
    })
    return
  }

  if (provider === 'sendgrid') {
    console.info('[user-mail] sending via SendGrid HTTP API')
    await sendViaSendGrid({ to, subject, text, html, from, category, preheader })
    return
  }

  console.info('[user-mail] sending via SMTP')
  await getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html,
    headers: preheader ? { 'X-Preheader': preheader } : undefined,
  })
}
