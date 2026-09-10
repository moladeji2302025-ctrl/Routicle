import nodemailer from 'nodemailer'

/**
 * Outbound email over SMTP.
 *
 * Defaults to Gmail, which needs an **App Password**, not the account password:
 * Google account → Security → 2-Step Verification → App passwords. A normal
 * password is rejected outright.
 *
 * SMTP_HOST/PORT are overridable so this can point at a transactional provider
 * later without touching callers — Gmail caps at roughly 500 recipients a day
 * and sends from a consumer address, so it is fine for a founding team and not
 * for launch volume.
 */
let transport = null

function getTransport() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null

  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 465
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      // 465 is implicit TLS; 587 upgrades with STARTTLS after connecting.
      secure: port === 465,
      auth: { user, pass },
    })
  }
  return transport
}

export function mailerConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export async function sendMail({ to, subject, text, html }) {
  const tx = getTransport()
  if (!tx) throw new Error('Email is not configured on the server (SMTP_USER / SMTP_PASS).')

  const from = process.env.MAIL_FROM || `Routicle <${process.env.SMTP_USER}>`
  return tx.sendMail({ from, to, subject, text, html })
}

/**
 * The invite itself. Plain text is sent alongside the HTML because a lone HTML
 * body scores badly with spam filters, and the link has to survive a client
 * that strips markup.
 */
export function inviteEmail({ teamName, inviterName, acceptUrl, role }) {
  const team = escapeHtml(teamName)
  const inviter = escapeHtml(inviterName || 'A teammate')
  const roleLine = role && role !== 'member' ? ` as ${escapeHtml(role)}` : ''

  const text = [
    `${inviterName || 'A teammate'} invited you to join ${teamName} on Routicle.`,
    '',
    'A Routicle workspace shares one plan, one collection of saved work, one set of folders and one download history across everyone in it.',
    '',
    `Accept: ${acceptUrl}`,
    '',
    "This link expires in 7 days. If you weren't expecting it, you can ignore this email.",
  ].join('\n')

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#16161a">
  <p style="margin:0 0 24px;font-size:18px;font-weight:700;letter-spacing:-0.01em">Routicle</p>
  <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.02em">
    ${inviter} invited you to join ${team}${roleLine}
  </h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#5a5a63">
    A Routicle workspace shares one plan, one collection of saved work, one set of folders and one
    download history across everyone in it.
  </p>
  <a href="${acceptUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#6750de;color:#fff;font-size:14px;font-weight:600;text-decoration:none">
    Join ${team}
  </a>
  <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#8a8a94">
    Or paste this into your browser:<br />
    <span style="color:#6750de;word-break:break-all">${escapeHtml(acceptUrl)}</span>
  </p>
  <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#8a8a94">
    This link expires in 7 days. If you weren't expecting it, you can ignore this email.
  </p>
</div>`.trim()

  return { text, html }
}
