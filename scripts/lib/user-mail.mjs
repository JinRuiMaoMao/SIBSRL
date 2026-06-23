import nodemailer from 'nodemailer'

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
    })
  }
  return transporter
}

/** @param {{ to: string, code: string, purpose: 'register' | 'reset' }} params */
export async function sendVerificationEmail({ to, code, purpose }) {
  const { from } = requireSmtpConfig()
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

  await getTransporter().sendMail({ from, to, subject, text, html })
}
