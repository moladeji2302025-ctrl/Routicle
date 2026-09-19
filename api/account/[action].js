import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { disableSubscription } from '../_lib/paystack.js'
import { sendMail, inviteEmail, deletionCodeEmail, lockoutEmail, mailerConfigured, explainMailError } from '../_lib/mailer.js'
import { checkSignIn, LOCK_MINUTES } from '../_lib/loginGuard.js'
import { issueCode, consumeCode, maskEmail } from '../_lib/verifyCodes.js'
import { limit, LIMITS } from '../_lib/ratelimit.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'
import { withCors } from '../_lib/cors.js'

const INVITE_DAYS = 7

/**
 * Authenticated self-service account actions.
 *
 * GET  /api/account/teams    this account's workspaces, with its role in each
 * GET  /api/account/members  ?organizationId= — one workspace's members
 * POST /api/account/delete-request           emails a one-time code
 * POST /api/account/delete   { code }         deletes, once the code checks out
 *
 * Members lives here rather than under a team route purely for Vercel's
 * twelve-function budget; it is still scoped to workspaces the caller is in.
 */
export default withCors(['GET', 'POST'], async function handler(req, res) {
  await withErrorHandling(res, async () => {
    const action = req.query?.action
    if (action === 'teams') return listTeams(req, res)
    if (action === 'members') return listMembers(req, res)
    if (action === 'invite') return inviteMember(req, res)
    if (action === 'signin-check') return signInCheck(req, res)
    if (action === 'delete-request') return requestDeletion(req, res)
    if (action === 'delete') return deleteAccount(req, res)
    return send(res, 404, { error: `Unknown account route: ${action}` })
  })
})

/** Shaped to match what the team UI already renders: id, userId, role, user{}. */
async function listMembers(req, res) {
  if (!methodGuard(req, res, ['GET'])) return
  const user = await requireUser(req, res)
  if (!user) return

  const organizationId = req.query?.organizationId
  if (!organizationId) return send(res, 400, { error: 'organizationId is required' })

  // Only people already in a workspace can see who else is in it.
  const mine = await sql`
    SELECT 1 FROM neon_auth.member
    WHERE "organizationId" = ${organizationId} AND "userId" = ${user.id} LIMIT 1
  `
  if (mine.length === 0) return send(res, 403, { error: 'You are not a member of this workspace' })

  const rows = await sql`
    SELECT m.id, m."userId", m.role, m."createdAt", u.name, u.email, u.image
    FROM neon_auth.member m
    JOIN neon_auth."user" u ON u.id = m."userId"
    WHERE m."organizationId" = ${organizationId}
    ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, m."createdAt"
  `

  send(res, 200, {
    members: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      role: r.role,
      createdAt: r.createdAt,
      user: { id: r.userId, name: r.name, email: r.email, image: r.image },
    })),
  })
}

/**
 * Read from neon_auth.member rather than the auth client's organization.list(),
 * which returns organizations with no members array at all — every role came
 * back undefined, which silently hid the invite, remove and delete controls
 * from the very people allowed to use them.
 */
async function listTeams(req, res) {
  if (!methodGuard(req, res, ['GET'])) return
  const user = await requireUser(req, res)
  if (!user) return

  const rows = await sql`
    SELECT o.id, o.name, o.slug, o.metadata, m.role,
           (SELECT COUNT(*)::int FROM neon_auth.member m2 WHERE m2."organizationId" = o.id) AS member_count
    FROM neon_auth.member m
    JOIN neon_auth.organization o ON o.id = m."organizationId"
    WHERE m."userId" = ${user.id}
    ORDER BY o."createdAt"
  `

  send(res, 200, {
    teams: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      metadata: r.metadata,
      role: r.role,
      memberCount: r.member_count,
    })),
  })
}

/**
 * Creates the invitation row and emails the link.
 *
 * The row is written here rather than through the auth client's inviteMember so
 * we hold the invitation id and can put it in the email — and because the
 * schema is known, unlike that client's response shape. Acceptance still goes
 * through Better Auth's own accept-invitation, which reads this same table.
 */
async function inviteMember(req, res) {
  if (!methodGuard(req, res, ['POST'])) return
  const user = await requireUser(req, res)
  if (!user) return

  const { organizationId, email, role } = req.body || {}
  const invitee = (email || '').trim().toLowerCase()
  if (!organizationId || !invitee) {
    return send(res, 400, { error: 'organizationId and email are required' })
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(invitee)) {
    return send(res, 400, { error: 'That does not look like an email address.' })
  }
  const inviteRole = ['member', 'admin'].includes(role) ? role : 'member'

  // Fail before sending anything if the server has no mailer, rather than
  // recording an invitation nobody will ever be told about.
  if (!mailerConfigured()) {
    return send(res, 503, {
      error:
        'Email is not set up on the server yet, so the invite was not sent. Set RESEND_API_KEY (or SMTP_USER and SMTP_PASS).',
    })
  }

  const caller = await sql`
    SELECT m.role, o.name FROM neon_auth.member m
    JOIN neon_auth.organization o ON o.id = m."organizationId"
    WHERE m."organizationId" = ${organizationId} AND m."userId" = ${user.id}
  `
  if (caller.length === 0) return send(res, 403, { error: 'You are not a member of this workspace' })
  if (!['owner', 'admin'].includes(caller[0].role)) {
    return send(res, 403, { error: 'Only a workspace owner or admin can invite people' })
  }
  const teamName = caller[0].name

  const already = await sql`
    SELECT 1 FROM neon_auth.member m
    JOIN neon_auth."user" u ON u.id = m."userId"
    WHERE m."organizationId" = ${organizationId} AND lower(u.email) = ${invitee} LIMIT 1
  `
  if (already.length > 0) return send(res, 409, { error: 'They are already in this workspace.' })

  // Supersede any earlier pending invite for the same address, so a resend
  // leaves exactly one live link rather than several that all still work.
  await sql`
    UPDATE neon_auth.invitation SET status = 'canceled'
    WHERE "organizationId" = ${organizationId} AND lower(email) = ${invitee} AND status = 'pending'
  `

  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const rows = await sql`
    INSERT INTO neon_auth.invitation ("organizationId", email, role, status, "expiresAt", "inviterId")
    VALUES (${organizationId}, ${invitee}, ${inviteRole}, 'pending', ${expiresAt}, ${user.id})
    RETURNING id
  `
  const invitationId = rows[0].id

  const base = (process.env.APP_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`).replace(/\/$/, '')
  const acceptUrl = `${base}/invite/${invitationId}`
  const { text, html } = inviteEmail({ teamName, inviterName: user.name, acceptUrl, role: inviteRole })

  try {
    await sendMail({
      to: invitee,
      subject: `${user.name || 'A teammate'} invited you to ${teamName} on Routicle`,
      text,
      html,
      // Everything sends from one shared address, so replies would otherwise
      // land nowhere useful instead of with the person who invited them.
      replyTo: user.email,
    })
  } catch (err) {
    console.error('invite email failed', err)
    // Don't leave a live invitation behind for a mail that never went out.
    await sql`UPDATE neon_auth.invitation SET status = 'canceled' WHERE id = ${invitationId}`
    return send(res, 502, { error: `The invite could not be emailed. ${explainMailError(err)}` })
  }

  send(res, 201, { ok: true, invitationId, email: invitee })
}

/**
 * The gate every password sign-in passes through before the browser signs in
 * with Neon Auth. See _lib/loginGuard.js for why the check lives here and the
 * lock lives in Neon Auth.
 */
async function signInCheck(req, res) {
  if (!methodGuard(req, res, ['POST'])) return

  // Per-IP, on top of the per-account count: without it one address could
  // lock out any number of accounts by spraying wrong passwords.
  if (!(await limit(req, res, { name: 'signin-check', limit: 30, windowSeconds: 600 }))) return

  const { email, password } = req.body || {}
  if (!email || !password) return send(res, 400, { error: 'Enter your email and password.' })

  const result = await checkSignIn(email, password)

  if (result.status === 'ok') return send(res, 200, { ok: true })

  if (result.status === 'wrong') {
    // One message for a wrong password and an unknown address alike.
    return send(res, 401, {
      error:
        result.remaining <= 2
          ? `Wrong email or password. ${result.remaining} ${result.remaining === 1 ? 'try' : 'tries'} left before the account is locked for ${LOCK_MINUTES} minutes.`
          : 'Wrong email or password.',
      remaining: result.remaining,
    })
  }

  // Locked. Notify the owner once, at the moment it locks.
  if (result.justLocked && result.userId && mailerConfigured()) {
    const base = (process.env.APP_URL || 'https://routicle.vercel.app').replace(/\/$/, '')
    const { text, html } = lockoutEmail({ minutes: LOCK_MINUTES, resetUrl: `${base}/signin?reset=1` })
    try {
      await sendMail({ to: result.email, subject: 'Your Routicle account was locked', text, html })
    } catch (err) {
      // The lock stands whether or not the email goes out.
      console.error('lockout email failed', err)
    }
  }

  const minutesLeft = Math.max(1, Math.ceil((new Date(result.until) - Date.now()) / 60000))
  return send(res, 423, {
    error: `Too many wrong passwords. This account is locked for ${minutesLeft} more minute${minutesLeft === 1 ? '' : 's'}.`,
    lockedUntil: result.until,
  })
}

/**
 * Workspaces this account owns, and a refusal message when any of them still
 * has other people in it. Deleting the owner of a shared workspace would strand
 * everyone else in a team nobody can administer.
 */
async function ownershipBlock(userId) {
  const owned = await sql`
    SELECT o.id, o.name,
           (SELECT COUNT(*)::int FROM neon_auth.member m2 WHERE m2."organizationId" = o.id) AS member_count
    FROM neon_auth.member m
    JOIN neon_auth.organization o ON o.id = m."organizationId"
    WHERE m."userId" = ${userId} AND m.role = 'owner'
  `
  const shared = owned.filter((o) => o.member_count > 1)
  const error = shared.length
    ? `You still own ${shared.length === 1 ? 'a workspace' : 'workspaces'} with other members: ` +
      `${shared.map((o) => o.name).join(', ')}. Transfer ownership or remove the other members first.`
    : null
  return { owned, error }
}

/**
 * Step one: email a code to the account's own address.
 *
 * The ownership check runs here as well as at deletion, so nobody is sent a
 * code they would then be unable to use.
 */
async function requestDeletion(req, res) {
  if (!methodGuard(req, res, ['POST'])) return

  const user = await requireUser(req, res)
  if (!user) return
  // Tight, because every request sends an email.
  if (!(await limit(req, res, { name: 'delete-code', key: user.id, ...LIMITS.sensitive }))) return

  if (!user.email) return send(res, 400, { error: 'This account has no email address to verify with.' })
  if (!mailerConfigured()) {
    return send(res, 503, { error: "Email isn't set up on the server yet, so a verification code can't be sent." })
  }

  const { error } = await ownershipBlock(user.id)
  if (error) return send(res, 409, { error })

  const { code, minutes } = await issueCode(user.id, 'delete-account')
  const { text, html } = deletionCodeEmail({ code, minutes })

  try {
    await sendMail({ to: user.email, subject: 'Your Routicle account deletion code', text, html })
  } catch (err) {
    console.error('deletion code email failed', err)
    return send(res, 502, { error: `We couldn't send the code. ${explainMailError(err)}` })
  }

  send(res, 200, { ok: true, sentTo: maskEmail(user.email), minutes })
}

/** Step two: delete, but only with the code that was emailed. */
async function deleteAccount(req, res) {
  if (!methodGuard(req, res, ['POST'])) return

  const user = await requireUser(req, res)
  if (!user) return
  if (!(await limit(req, res, { name: 'delete-verify', key: user.id, ...LIMITS.sensitive }))) return

  const check = await consumeCode(user.id, 'delete-account', req.body?.code)
  if (!check.ok) {
    const messages = {
      missing: 'Ask for a verification code first.',
      expired: 'That code has expired. Ask for a new one.',
      locked: 'Too many wrong attempts. Ask for a new code.',
      wrong:
        check.remaining > 0
          ? `That code isn't right. ${check.remaining} ${check.remaining === 1 ? 'try' : 'tries'} left.`
          : 'That code isn\'t right, and it has now been cancelled. Ask for a new one.',
    }
    return send(res, check.reason === 'locked' ? 429 : 400, { error: messages[check.reason], reason: check.reason })
  }

  /* ---- Workspaces this account owns ---- */

  // Checked again: membership can change in the ten minutes a code is valid.
  const { owned, error } = await ownershipBlock(user.id)
  if (error) return send(res, 409, { error })

  const soloIds = owned.map((o) => o.id)

  /* ---- Stop billing before anything is destroyed ---- */

  // subscriptions rows cascade away with the user and with any solo workspace,
  // but Paystack keeps charging the card until it is told otherwise — and once
  // the rows are gone there is nothing left to tell it with.
  const subs = soloIds.length
    ? await sql`
        SELECT id, provider_subscription_code, provider_email_token FROM subscriptions
        WHERE status = 'active'
          AND (user_id = ${user.id} OR organization_id = ANY(${soloIds}::uuid[]))
      `
    : await sql`
        SELECT id, provider_subscription_code, provider_email_token FROM subscriptions
        WHERE status = 'active' AND user_id = ${user.id}
      `

  for (const sub of subs) {
    if (!sub.provider_subscription_code || !sub.provider_email_token) continue
    try {
      await disableSubscription({ code: sub.provider_subscription_code, token: sub.provider_email_token })
    } catch (err) {
      console.error('Paystack disable failed during account deletion', err)
      // Abort rather than delete: a deleted account that is still being
      // charged is far worse than a deletion the user has to retry.
      return send(res, 502, {
        error:
          "We couldn't cancel your subscription with the payment provider, so nothing has been deleted. Please try again.",
      })
    }
  }

  /* ---- Delete ---- */

  // Solo workspaces first: their folders, shared collection and subscription
  // rows all cascade from the organization.
  if (soloIds.length > 0) {
    await sql`DELETE FROM neon_auth.organization WHERE id = ANY(${soloIds}::uuid[])`
  }

  // Sessions, OAuth accounts, memberships, personal saved items, transactions
  // and any admin grant cascade from the user row. Work published as a creator
  // does not: `creators` is keyed by email with no FK to the auth user, so it
  // stays credited and in the library, which is what the UI promises.
  await sql`DELETE FROM neon_auth."user" WHERE id = ${user.id}`

  send(res, 200, { ok: true, deletedWorkspaces: soloIds.length })
}
