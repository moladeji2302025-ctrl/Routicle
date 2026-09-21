import { sql } from '../db.js'
import { sendMail, mailerConfigured, explainMailError } from '../mailer.js'
import { appBase } from './layout.js'
import * as t from './templates.js'
import {
  beginLog,
  finishLog,
  getPreferences,
  isSuppressed,
  normalizeEmail,
} from './store.js'

/**
 * The one way to send an email.
 *
 * Categories decide what may stop a message:
 *
 *   transactional   receipts, security notices, invites, codes. Always sent,
 *                   unless the address is suppressed.
 *   notification    optional activity email. Skipped when the account has
 *                   switched that kind off (`prefKey`).
 *   marketing       newsletters. Sent only to people who asked for them, and
 *                   carries a one-click unsubscribe.
 *
 * Every attempt is logged, including the ones that were skipped, so "why didn't
 * they get it" always has an answer.
 *
 * `deliver` does not throw by default: a failed courtesy email must never fail
 * the request that triggered it (a payment confirmation, an approval). Callers
 * for whom the email IS the request (an invite, a verification code) pass
 * `throwOnError` and report the failure to the person.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function deliver({
  to,
  subject,
  text,
  html,
  category = 'transactional',
  template,
  userId,
  prefKey,
  dedupeKey,
  replyTo,
  headers,
  from,
  throwOnError = false,
}) {
  const address = normalizeEmail(to)

  const fail = (status, message, extra = {}) => {
    const result = { ok: false, status, error: message }
    if (throwOnError) throw Object.assign(new Error(message), extra)
    return result
  }

  if (!EMAIL_RE.test(address)) return fail('failed', 'That is not a valid email address.')

  try {
    // 1. An address that bounced or complained is never mailed again.
    const suppressedFor = await isSuppressed(address)
    if (suppressedFor) {
      const id = await beginLog({ to: address, category, template, subject, dedupeKey: null, userId })
      await finishLog(id, { status: 'suppressed', error: `On the suppression list (${suppressedFor})` })
      return fail('suppressed', `Suppressed (${suppressedFor})`, { suppressed: true })
    }

    // 2. Optional email respects the account's own choice.
    if (category === 'notification' && prefKey && userId) {
      const prefs = await getPreferences(userId)
      if (prefs[prefKey] === false) {
        const id = await beginLog({ to: address, category, template, subject, dedupeKey: null, userId })
        await finishLog(id, { status: 'skipped', error: `Turned off in notification settings (${prefKey})` })
        return { ok: false, status: 'skipped' }
      }
    }

    // 3. Not the same message twice.
    const logId = await beginLog({ to: address, category, template, subject, dedupeKey, userId })
    if (!logId) return { ok: false, status: 'duplicate' }

    if (!mailerConfigured()) {
      await finishLog(logId, { status: 'skipped', error: 'Email is not configured on the server' })
      return fail('skipped', 'Email is not configured on the server (RESEND_API_KEY, or SMTP_USER / SMTP_PASS).')
    }

    // 4. Send.
    try {
      const { id } = await sendMail({
        to: address,
        subject,
        text,
        html,
        replyTo,
        headers,
        from,
        // The log row's id doubles as the idempotency key, so a retry after a
        // timeout can't produce a second message.
        idempotencyKey: dedupeKey || logId,
        tags: [
          { name: 'category', value: category },
          ...(template ? [{ name: 'template', value: template }] : []),
        ],
      })
      await finishLog(logId, { status: 'sent', providerId: id })
      return { ok: true, status: 'sent', id }
    } catch (err) {
      await finishLog(logId, { status: 'failed', error: explainMailError(err) })
      console.error(`email "${template || subject}" to ${address} failed:`, err.message)
      if (throwOnError) throw err
      return { ok: false, status: 'failed', error: explainMailError(err) }
    }
  } catch (err) {
    if (throwOnError) throw err
    console.error('email system error:', err.message)
    return { ok: false, status: 'failed', error: err.message }
  }
}

/**
 * Waits for an email for at most `ms`, then carries on without it.
 *
 * For requests where someone is waiting on a page that has nothing to do with
 * email (a client submitting a form). The send is not cancelled, only no longer
 * waited for, and it is already recorded in the log before it starts.
 */
export function withinMs(promise, ms = 2500) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve({ ok: false, status: 'pending' }), ms))])
}

/* ---------------------------------------------------------------- lookups */

async function userById(userId) {
  if (!userId) return null
  const rows = await sql`SELECT id, email, name FROM neon_auth."user" WHERE id = ${userId} LIMIT 1`
  return rows[0] || null
}

/* ----------------------------------------------------- what people get */

/** Once per account, and only for accounts that are actually new. */
export async function notifyWelcome(user) {
  const { subject, html, text } = t.welcomeEmail({ name: user.name })
  return deliver({
    to: user.email,
    subject,
    html,
    text,
    category: 'transactional',
    template: 'welcome',
    userId: user.id,
    dedupeKey: `welcome:${user.id}`,
  })
}

/**
 * A payment was confirmed and a plan is active. Keyed by the payment
 * reference: the webhook and the buyer's return to the site both confirm the
 * same payment, and only one of them may send the receipt.
 */
export async function notifySubscriptionActive({ userId, organizationId, tier, cycle, amountMinor, currency, reference, periodEnd }) {
  const user = await userById(userId)
  if (!user?.email) return null

  let teamName = ''
  if (organizationId) {
    const rows = await sql`SELECT name FROM neon_auth.organization WHERE id = ${organizationId}`
    teamName = rows[0]?.name || ''
  }

  const { subject, html, text } = t.receiptEmail({ tier, cycle, amountMinor, currency, reference, periodEnd, teamName })
  return deliver({
    to: user.email,
    subject,
    html,
    text,
    category: 'transactional',
    template: 'receipt',
    userId: user.id,
    dedupeKey: `receipt:${reference}`,
  })
}

/** A renewal failed. At most one notice per subscription per day. */
export async function notifyPaymentFailed({ subscriptionCode }) {
  if (!subscriptionCode) return null
  const rows = await sql`
    SELECT user_id, tier, current_period_end FROM subscriptions WHERE provider_subscription_code = ${subscriptionCode} LIMIT 1
  `
  const sub = rows[0]
  const user = await userById(sub?.user_id)
  if (!user?.email) return null

  const { subject, html, text } = t.paymentFailedEmail({ tier: sub.tier, accessUntil: sub.current_period_end })
  return deliver({
    to: user.email,
    subject,
    html,
    text,
    category: 'transactional',
    template: 'payment_failed',
    userId: user.id,
    dedupeKey: `pastdue:${subscriptionCode}:${new Date().toISOString().slice(0, 10)}`,
  })
}

export async function notifyCanceled({ subscriptionId, userId, tier, accessUntil }) {
  const user = await userById(userId)
  if (!user?.email) return null
  const { subject, html, text } = t.canceledEmail({ tier, accessUntil })
  return deliver({
    to: user.email,
    subject,
    html,
    text,
    category: 'transactional',
    template: 'canceled',
    userId: user.id,
    dedupeKey: `cancel:${subscriptionId}`,
  })
}

/** A creator's upload was received. */
export async function notifySubmissionReceived({ creatorEmail, title, itemId }) {
  const user = await userByEmail(creatorEmail)
  const { subject, html, text } = t.submissionReceivedEmail({ title })
  return deliver({
    to: creatorEmail,
    subject,
    html,
    text,
    category: 'notification',
    prefKey: 'moderationResults',
    template: 'submission_received',
    userId: user?.id,
    dedupeKey: `submitted:${itemId}`,
  })
}

/**
 * A reviewer approved or rejected a piece. Called from both places a status
 * can change (the moderation queue and the library page), and only when it
 * actually changed, so re-saving an approved piece doesn't announce it again.
 */
export async function notifyModeration({ itemId, title, status, note, creatorEmail, moderatedAt }) {
  if (!['approved', 'rejected'].includes(status)) return null
  const user = await userByEmail(creatorEmail)
  const { subject, html, text } =
    status === 'approved'
      ? t.submissionApprovedEmail({ title, itemId })
      : t.submissionRejectedEmail({ title, note })
  return deliver({
    to: creatorEmail,
    subject,
    html,
    text,
    category: 'notification',
    prefKey: 'moderationResults',
    template: `submission_${status}`,
    userId: user?.id,
    dedupeKey: `moderation:${itemId}:${status}:${moderatedAt ? new Date(moderatedAt).getTime() : Date.now()}`,
  })
}

/** A client filled in the discovery form. */
export async function notifyClientResponse({ ownerUserId, projectId, projectName, respondent, formTitle, submissionId }) {
  const owner = await userById(ownerUserId)
  if (!owner?.email) return null
  const { subject, html, text } = t.clientResponseEmail({ projectName, projectId, respondent, formTitle })
  return deliver({
    to: owner.email,
    subject,
    html,
    text,
    category: 'notification',
    prefKey: 'clientResponses',
    template: 'client_response',
    userId: owner.id,
    dedupeKey: `formresp:${submissionId}`,
  })
}

async function userByEmail(email) {
  if (!email) return null
  const rows = await sql`SELECT id, email, name FROM neon_auth."user" WHERE lower(email) = ${normalizeEmail(email)} LIMIT 1`
  return rows[0] || null
}

/* ------------------------------------------------------- newsletter links */

/** The per-subscriber unsubscribe URL, and the headers that make it one click. */
export function unsubscribeLinks(token) {
  const url = `${appBase()}/api/public/newsletter?unsubscribe=${encodeURIComponent(token)}`
  return {
    url,
    headers: {
      // RFC 8058: mail clients show their own Unsubscribe button and POST here.
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}
