import { sql } from '../db.js'
import { requireAdmin } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import {
  mailerConfigured,
  mailerName,
  fromAddress,
  fromDomain,
  replyToAddress,
  resendDomainStatus,
  explainMailError,
} from '../mailer.js'
import { deliver } from '../email/index.js'
import * as t from '../email/templates.js'
import { ensureEmailTables, suppress, unsuppress, normalizeEmail } from '../email/store.js'

/**
 * The email console, for platform admins.
 *
 * GET                       configuration and health
 * GET  ?op=log&status=&q=   recent sends
 * GET  ?op=suppressions     addresses we won't mail
 * GET  ?op=preview&t=       a template rendered with sample data
 * POST { op: 'test', to, template? }   send a test (or a sample of a template) and report exactly what happened
 * POST { op: 'suppress', email }
 * DELETE ?email=            take an address off the suppression list
 */

const SAMPLES = {
  welcome: () => t.welcomeEmail({ name: 'Ada Obi' }),
  receipt: () =>
    t.receiptEmail({ tier: 'standard', cycle: 'monthly', amountMinor: 1200000, currency: 'NGN', reference: 'rtc_8f3a2c', periodEnd: new Date(Date.now() + 30 * 864e5), teamName: '' }),
  payment_failed: () => t.paymentFailedEmail({ tier: 'standard', accessUntil: new Date(Date.now() + 5 * 864e5) }),
  canceled: () => t.canceledEmail({ tier: 'standard', accessUntil: new Date(Date.now() + 12 * 864e5) }),
  submission_received: () => t.submissionReceivedEmail({ title: 'Rivers & Wells brand deck' }),
  submission_approved: () => t.submissionApprovedEmail({ title: 'Rivers & Wells brand deck', itemId: 'sample' }),
  submission_rejected: () => t.submissionRejectedEmail({ title: 'Rivers & Wells brand deck', note: 'The preview shows a client logo. Please replace it with your own work.' }),
  client_response: () => t.clientResponseEmail({ projectName: 'Bakery rebrand', projectId: 'sample', respondent: 'Mark Epkang', formTitle: 'Discovery' }),
  invite: () => t.inviteEmail({ teamName: 'Studio North', inviterName: 'Ada Obi', acceptUrl: 'https://routicle.vercel.app/invite/sample', role: 'member' }),
  lockout: () => t.lockoutEmail({ minutes: 30, resetUrl: 'https://routicle.vercel.app/signin?reset=1' }),
  deletion_code: () => t.deletionCodeEmail({ code: '482913', minutes: 10 }),
  newsletter_confirm: () => t.newsletterConfirmEmail({ confirmUrl: 'https://routicle.vercel.app/api/public/newsletter?confirm=sample' }),
}

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return
    const admin = await requireAdmin(req, res)
    if (!admin) return
    await run(req, res, admin)
  })
}

/** The handler proper, taking an already-verified admin. Exported so it can be tested. */
export async function run(req, res, admin) {
  await ensureEmailTables()

  const op = req.query?.op || req.body?.op || ''

  /* --------------------------------------------------------------- GET */
  if (req.method === 'GET') {
    if (op === 'log') {
      const status = req.query?.status || null
      const q = String(req.query?.q || '').trim().toLowerCase()
      const rows = await sql`
        SELECT id, to_email, category, template, subject, status, error, created_at
        FROM email_log
        WHERE (${status}::text IS NULL OR status = ${status})
          AND (${q || null}::text IS NULL OR lower(to_email) LIKE ${`%${q}%`} OR lower(coalesce(subject,'')) LIKE ${`%${q}%`})
        ORDER BY created_at DESC
        LIMIT 150
      `
      const counts = await sql`
        SELECT status, COUNT(*)::int AS n FROM email_log WHERE created_at > now() - interval '7 days' GROUP BY status
      `
      return send(res, 200, {
        rows: rows.map((r) => ({
          id: r.id,
          to: r.to_email,
          category: r.category,
          template: r.template,
          subject: r.subject,
          status: r.status,
          error: r.error,
          createdAt: r.created_at,
        })),
        counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
      })
    }

    if (op === 'suppressions') {
      const rows = await sql`SELECT email, reason, detail, created_at FROM email_suppressions ORDER BY created_at DESC LIMIT 500`
      return send(res, 200, {
        rows: rows.map((r) => ({ email: r.email, reason: r.reason, detail: r.detail, createdAt: r.created_at })),
      })
    }

    if (op === 'preview') {
      const name = req.query?.t
      const make = SAMPLES[name]
      if (!make) return send(res, 404, { error: 'Unknown template' })
      const { subject, html, text } = make()
      return send(res, 200, { subject: subject || name, html, text })
    }

    // Status.
    const domain = fromDomain()
    const domainStatus = await resendDomainStatus(domain)
    const usingSharedSender = /@resend\.dev\b/i.test(fromAddress())
    return send(res, 200, {
      configured: mailerConfigured(),
      transport: mailerConfigured() ? mailerName() : null,
      from: fromAddress(),
      newsletterFrom: fromAddress('newsletter'),
      replyTo: replyToAddress() || null,
      appUrl: process.env.APP_URL || null,
      webhookSecretSet: Boolean(process.env.RESEND_WEBHOOK_SECRET),
      usingSharedSender,
      domain,
      domainStatus,
      templates: Object.keys(SAMPLES),
      env: {
        RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
        MAIL_FROM: Boolean(process.env.MAIL_FROM),
        MAIL_REPLY_TO: Boolean(process.env.MAIL_REPLY_TO),
        RESEND_WEBHOOK_SECRET: Boolean(process.env.RESEND_WEBHOOK_SECRET),
        APP_URL: Boolean(process.env.APP_URL),
      },
    })
  }

  /* -------------------------------------------------------------- POST */
  if (req.method === 'POST') {
    if (op === 'test') {
      const to = normalizeEmail(req.body?.to || admin.email)
      // A real copy of any template, with sample data, is the only preview that
      // shows how it looks in an inbox: the site's CSP rules out an in-page one.
      const sample = SAMPLES[req.body?.template]?.()
      const built =
        sample ||
        t.testEmail({
          transport: mailerConfigured() ? mailerName() : 'none',
          from: fromAddress(),
          sentAt: new Date().toUTCString(),
        })
      const { html, text } = built
      const subject = sample ? `[Sample] ${sample.subject || req.body.template}` : built.subject
      // Not swallowed: the whole point is to see exactly why it failed.
      const result = await deliver({ to, subject, html, text, category: 'transactional', template: 'test', userId: admin.id })
      return send(res, 200, {
        ok: result.ok,
        status: result.status,
        to,
        error: result.ok ? null : result.error || explainMailError(new Error(result.status)),
      })
    }

    if (op === 'suppress') {
      const email = normalizeEmail(req.body?.email)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, 400, { error: 'Enter a valid email address.' })
      await suppress(email, 'manual', 'Added by an admin')
      return send(res, 200, { ok: true })
    }

    return send(res, 400, { error: 'Unknown operation' })
  }

  /* ------------------------------------------------------------ DELETE */
  const email = normalizeEmail(req.query?.email)
  if (!email) return send(res, 400, { error: 'email is required' })
  await unsuppress(email)
  return send(res, 200, { ok: true })
}
