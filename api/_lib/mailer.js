import nodemailer from 'nodemailer'

/**
 * The transport: how a message actually leaves the server.
 *
 * Prefers Resend's HTTP API, and falls back to SMTP when only SMTP_USER/PASS
 * are set. HTTP is a better fit for serverless than SMTP: one short request
 * rather than a multi-round-trip TLS handshake and AUTH exchange held open for
 * the life of the invocation.
 *
 * Most code should not call this directly. `deliver()` in ./email/index.js
 * wraps it with the suppression list, notification preferences, duplicate
 * protection and the send log. This file only knows how to talk to a provider.
 *
 * Resend will only deliver to arbitrary addresses once a sending domain is
 * verified. Until then its shared `onboarding@resend.dev` sender is restricted
 * to the account owner's own address; explainMailError reports that case
 * rather than letting it read as a generic failure.
 */

// The message templates live in ./email/templates.js. They are re-exported here
// because this is where the invite, lockout, deletion and newsletter code has
// always imported them from.
export {
  inviteEmail,
  lockoutEmail,
  deletionCodeEmail,
  newsletterConfirmEmail,
} from './email/templates.js'

const RESEND_API = 'https://api.resend.com'

// Vercel's Hobby functions stop at 10 seconds. One retry inside that budget is
// worth having; a second would only turn a slow failure into a timed-out one.
const ATTEMPT_TIMEOUT_MS = 4500
const RETRY_DELAY_MS = 600

function resendKey() {
  return (process.env.RESEND_API_KEY || '').trim()
}

/**
 * Google shows an App Password as four space-separated groups
 * ("abcd efgh ijkl mnop") and Gmail's SMTP AUTH rejects the spaces, failing as
 * 535-5.7.8, which reads like a wrong password rather than a formatting
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

/** Which transport is actually in play, quoted in errors so they're diagnosable. */
export function mailerName() {
  return resendKey() ? 'Resend' : 'SMTP'
}

/**
 * The From address. `kind` picks between the everyday sender and, optionally,
 * a separate one for newsletters, so bulk mail can carry its own reputation.
 */
export function fromAddress(kind = 'default') {
  if (kind === 'newsletter' && process.env.MAIL_FROM_NEWSLETTER) return process.env.MAIL_FROM_NEWSLETTER
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM
  // Resend's shared sender works with no DNS setup at all, so mail can be
  // tested before a domain exists.
  if (resendKey()) return 'Routicle <onboarding@resend.dev>'
  return `Routicle <${smtpCredentials().user}>`
}

/** The domain part of the From address, for checking it against Resend's list. */
export function fromDomain(kind = 'default') {
  const m = /@([^>\s]+)/.exec(fromAddress(kind))
  return m ? m[1].toLowerCase() : ''
}

export function replyToAddress() {
  return (process.env.MAIL_REPLY_TO || '').trim() || undefined
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

/* ---------------------------------------------------------------- Resend */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * One request to Resend, retried once on a rate limit or a server error.
 * A 4xx that isn't a rate limit is the message's fault, and sending it again
 * can't help, so it is thrown straight away.
 */
async function resendRequest(path, { body, idempotencyKey, headers = {} }) {
  const key = resendKey()
  let lastError

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)
    try {
      const res = await fetch(`${RESEND_API}${path}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${key}`,
          'content-type': 'application/json',
          // Resend returns the original result for a repeated key, so a
          // retry after a timeout can't send the same email twice.
          ...(idempotencyKey ? { 'idempotency-key': String(idempotencyKey).slice(0, 256) } : {}),
          ...headers,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => null)
      if (res.ok) return json

      const err = new Error(json?.message || json?.error || `Resend returned ${res.status}`)
      err.status = res.status
      err.resendName = json?.name
      if (res.status !== 429 && res.status < 500) throw err
      lastError = err
    } catch (err) {
      if (err.status && err.status !== 429 && err.status < 500) throw err
      lastError = err.name === 'AbortError' ? Object.assign(new Error('Resend did not answer in time'), { status: 504 }) : err
    } finally {
      clearTimeout(timer)
    }
    if (attempt === 0) await sleep(RETRY_DELAY_MS)
  }
  throw lastError
}

/** Resend tag values may only contain letters, numbers, underscores and dashes. */
const tagValue = (v) => String(v).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256)

function resendPayload({ to, subject, text, html, replyTo, headers, tags, from }) {
  return {
    from: from || fromAddress(),
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
    ...((replyTo || replyToAddress()) ? { reply_to: replyTo || replyToAddress() } : {}),
    ...(headers && Object.keys(headers).length ? { headers } : {}),
    ...(tags?.length ? { tags: tags.map((t) => ({ name: tagValue(t.name), value: tagValue(t.value) })) } : {}),
  }
}

/**
 * Sends one message. Resolves to { id } (the provider's id for it) and throws
 * on failure with `.status` set when the provider gave one.
 */
export async function sendMail({ to, subject, text, html, replyTo, headers, tags, from, idempotencyKey }) {
  if (resendKey()) {
    const body = await resendRequest('/emails', {
      body: resendPayload({ to, subject, text, html, replyTo, headers, tags, from }),
      idempotencyKey,
    })
    return { id: body?.id || null }
  }

  const tx = getSmtpTransport()
  if (!tx) throw new Error('Email is not configured on the server (RESEND_API_KEY, or SMTP_USER / SMTP_PASS).')

  const info = await tx.sendMail({
    from: from || fromAddress(),
    to,
    subject,
    text,
    html,
    ...((replyTo || replyToAddress()) ? { replyTo: replyTo || replyToAddress() } : {}),
    ...(headers && Object.keys(headers).length ? { headers } : {}),
  })
  return { id: info?.messageId || null }
}

/**
 * Sends up to 100 different messages in one request (Resend's batch endpoint).
 *
 * Resolves to one entry per message, in order: { id } or { error }. A batch
 * that Resend refuses as a whole (one bad address fails validation for all of
 * them) is retried message by message, so one typo can't sink 99 good ones.
 * Over SMTP there is no batch, so each goes on its own.
 */
export async function sendBatch(messages, { idempotencyKey } = {}) {
  if (!messages.length) return []

  if (resendKey()) {
    try {
      const body = await resendRequest('/emails/batch', {
        body: messages.map(resendPayload),
        idempotencyKey,
        // Deliver the valid ones and report the rest, rather than all-or-nothing.
        headers: { 'x-batch-validation': 'permissive' },
      })
      const data = body?.data || []
      const errors = body?.errors || []
      // In permissive mode `data` holds only the ones that were accepted, and
      // `errors` says which index failed, so the two are merged back in order.
      const failedAt = new Map(errors.map((x) => [x.index, x.message]))
      let next = 0
      return messages.map((_, i) => (failedAt.has(i) ? { error: failedAt.get(i) } : { id: data[next++]?.id || null }))
    } catch (err) {
      if (err.status && err.status < 500 && err.status !== 429) {
        // Fall through to one by one.
      } else {
        throw err
      }
    }
  }

  const out = []
  for (let i = 0; i < messages.length; i += 5) {
    const slice = messages.slice(i, i + 5)
    const results = await Promise.all(
      slice.map((m) =>
        sendMail({ ...m, idempotencyKey: idempotencyKey ? `${idempotencyKey}-${i}` : undefined })
          .then((r) => ({ id: r.id }))
          .catch((err) => ({ error: err.message || 'failed' }))
      )
    )
    out.push(...results)
  }
  return out
}

/* ---------------------------------------------------------- Resend admin */

/**
 * Asks Resend about the sending domain, for the admin status page.
 *
 * A key made with "Sending access" can send but can't list domains, so a
 * 401 or 403 here is not a problem, only a question the page can't answer.
 */
export async function resendDomainStatus(domain) {
  const key = resendKey()
  if (!key) return { checked: false, reason: 'not-using-resend' }
  try {
    const res = await fetch(`${RESEND_API}/domains`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
    })
    if (res.status === 401 || res.status === 403) {
      return { checked: false, reason: 'key-cannot-list-domains' }
    }
    const body = await res.json().catch(() => null)
    if (!res.ok) return { checked: false, reason: body?.message || `Resend returned ${res.status}` }
    const list = body?.data || []
    const match = list.find((d) => d.name?.toLowerCase() === domain)
    return {
      checked: true,
      domains: list.map((d) => ({ name: d.name, status: d.status })),
      match: match ? { name: match.name, status: match.status } : null,
    }
  } catch (err) {
    return { checked: false, reason: err.message }
  }
}

/* ---------------------------------------------------------------- errors */

/**
 * What a *user* is told when an email fails.
 *
 * The detailed explanation below names server configuration: env var names,
 * the mail host, and for Gmail even the length of the SMTP password. Its last
 * resort passes the provider's raw error straight through. That is useful to
 * whoever runs the platform and nobody else, so the detail is logged server
 * side and shown only to a platform admin. Everyone else gets a plain sentence.
 */
export function mailErrorFor(err, { isAdmin = false } = {}) {
  const detail = explainMailError(err)
  console.error('mail send failed:', detail)
  return isAdmin ? detail : "The email couldn't be sent right now. Please try again in a few minutes."
}

/** Turns a provider's terse failure into something the person clicking Invite can act on. */
export function explainMailError(err) {
  const raw = err?.message || String(err)

  /* ---- Resend ---- */
  if (err?.suppressed) {
    return 'That address is on the suppression list because an earlier email to it bounced or was reported as spam. Remove it in Admin > Email if it is now valid.'
  }
  if (/only send testing emails to your own|verify a domain|not verified|domain is not verified/i.test(raw)) {
    return (
      'Resend will only deliver to your own address until a sending domain is verified. ' +
      'Verify one at resend.com/domains and set MAIL_FROM to an address on it, or send to your own email to test.'
    )
  }
  if (err?.status === 401 || /API key is invalid|Unauthorized|restricted_api_key/i.test(raw)) {
    return 'Resend rejected the API key. Check RESEND_API_KEY at resend.com/api-keys.'
  }
  if (err?.status === 403 && /domain/i.test(raw)) {
    return `The sending domain isn't allowed for this key: ${raw}`
  }
  if (err?.status === 422 || /validation_error/i.test(raw)) {
    return `Resend refused the message: ${raw}`
  }
  if (err?.status === 429) {
    return 'Resend is rate limiting this account. Wait a moment and try again.'
  }
  if (err?.status === 504) {
    return 'Resend did not answer in time. The email may still arrive; check the log before sending again.'
  }

  /* ---- SMTP ---- */
  if (/535|BadCredentials|Username and Password not accepted/i.test(raw)) {
    const { pass } = smtpCredentials()
    return pass.length === 16
      ? 'Gmail rejected the sign-in. Check SMTP_USER is the exact address that generated the App Password, and that it has not been revoked.'
      : `Gmail rejected the sign-in. SMTP_PASS is ${pass.length} characters, but a Gmail App Password is 16. Generate one at myaccount.google.com/apppasswords.`
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(raw)) {
    return `Could not reach the mail server (${process.env.SMTP_HOST || 'smtp.gmail.com'}). Check SMTP_HOST and SMTP_PORT.`
  }

  return raw
}
