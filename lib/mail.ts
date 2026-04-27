import nodemailer from 'nodemailer'

function must(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

type SendAlertMailParams = {
  to?: string
  subject: string
  text: string
  html?: string
}

export async function sendAlertMail({
  to,
  subject,
  text,
  html,
}: SendAlertMailParams) {
  const host = must('SMTP_HOST')
  const port = Number(must('SMTP_PORT'))
  const secure = String(process.env.SMTP_SECURE ?? 'true') === 'true'
  const user = must('SMTP_USER')
  const pass = must('SMTP_PASS')

  const fallback = process.env.ALERT_EMAIL_TO?.trim() || null
  const finalTo = to?.trim() || fallback

  if (!finalTo) {
    throw new Error('No recipient email found (to or ALERT_EMAIL_TO)')
  }

  const from = process.env.MAIL_FROM ?? `DPPForge Alerts <${user}>`

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })

  const info = await transporter.sendMail({
    from,
    to: finalTo,
    subject: subject || 'DPPForge Alert',
    text,
    html,
  })

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  }
}