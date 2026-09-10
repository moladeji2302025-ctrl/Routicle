import nodemailer from 'nodemailer'

/**
 * Outbound email.
 *
 * Prefers Resend's HTTP API, and falls back to SMTP when only SMTP_USER/PASS
 * are set. HTTP is a better fit for serverless than SMTP: one short request
 * rather than a multi-round-trip TLS handshake and AUTH exchange held open for
 * the life of the invocation.
 *
 * Resend will only deliver to arbitrary addresses once a sending domain is
 * verified. Until then its shared `onboarding@resend.dev` sender is restricted
 * to the account owner's own address — see explainMailError, which reports that
 * case rather than letting it read as a generic failure.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function resendKey() {
  return (process.env.RESEND_API_KEY || '').trim()
}

/**
 * Google shows an App Password as four space-separated groups
 * ("abcd efgh ijkl mnop") and Gmail's SMTP AUTH rejects the spaces, failing as
 * 535-5.7.8 — which reads like a wrong password rather than a formatting
 * problem. Strip whitespace from both, plus any newline a paste picks up.
 */
function smtpCredentials() {
  return {
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  }
}

export function mailerConfigured() {
  if (resendKey()) return true
  const { user, pass } = smtpCredentials()
  return Boolean(user && pass)
}

/** Which transport is actually in play — quoted in errors so they're diagnosable. */
export function mailerName() {
  return resendKey() ? 'Resend' : 'SMTP'
}

function defaultFrom() {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM
  // Resend's shared sender works with no DNS setup at all, so invites can be
  // tested before a domain exists.
  if (resendKey()) return 'Routicle <onboarding@resend.dev>'
  return `Routicle <${smtpCredentials().user}>`
}

let transport = null

function getSmtpTransport() {
  const { user, pass } = smtpCredentials()
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

export async function sendMail({ to, subject, text, html, replyTo }) {
  const key = resendKey()

  if (key) {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: defaultFrom(),
        to: [to],
        subject,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })

    const body = await res.json().catch(() => null)
    if (!res.ok) {
      // Carry Resend's own wording through; explainMailError turns the common
      // ones into something actionable.
      const err = new Error(body?.message || body?.error || `Resend returned ${res.status}`)
      err.status = res.status
      throw err
    }
    return body
  }

  const tx = getSmtpTransport()
  if (!tx) throw new Error('Email is not configured on the server (RESEND_API_KEY, or SMTP_USER / SMTP_PASS).')

  return tx.sendMail({ from: defaultFrom(), to, subject, text, html, ...(replyTo ? { replyTo } : {}) })
}

/** Turns a provider's terse failure into something the person clicking Invite can act on. */
export function explainMailError(err) {
  const raw = err?.message || String(err)

  /* ---- Resend ---- */
  if (/only send testing emails to your own|verify a domain|not verified/i.test(raw)) {
    return (
      'Resend will only deliver to your own address until a sending domain is verified. ' +
      'Verify one at resend.com/domains and set MAIL_FROM to an address on it, or invite your own email to test.'
    )
  }
  if (err?.status === 401 || /API key is invalid|Unauthorized/i.test(raw)) {
    return 'Resend rejected the API key. Check RESEND_API_KEY at resend.com/api-keys.'
  }
  if (err?.status === 422 || /validation_error/i.test(raw)) {
    return `Resend refused the message: ${raw}`
  }
  if (err?.status === 429) {
    return 'Resend is rate limiting this account. Wait a moment and try again.'
  }

  /* ---- SMTP ---- */
  if (/535|BadCredentials|Username and Password not accepted/i.test(raw)) {
    const { pass } = smtpCredentials()
    return pass.length === 16
      ? 'Gmail rejected the sign-in. Check SMTP_USER is the exact address that generated the App Password, and that it has not been revoked.'
      : `Gmail rejected the sign-in. SMTP_PASS is ${pass.length} characters, but a Gmail App Password is 16 — generate one at myaccount.google.com/apppasswords.`
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(raw)) {
    return `Could not reach the mail server (${process.env.SMTP_HOST || 'smtp.gmail.com'}). Check SMTP_HOST and SMTP_PORT.`
  }

  return raw
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
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
