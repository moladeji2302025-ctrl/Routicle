import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { disableSubscription } from '../_lib/paystack.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'

/**
 * Authenticated self-service account actions.
 *
 * GET  /api/account/teams    this account's workspaces, with its role in each
 * GET  /api/account/members  ?organizationId= — one workspace's members
 * POST /api/account/delete   { confirmEmail }
 *
 * Members lives here rather than under a team route purely for Vercel's
 * twelve-function budget; it is still scoped to workspaces the caller is in.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    const action = req.query?.action
    if (action === 'teams') return listTeams(req, res)
    if (action === 'members') return listMembers(req, res)
    if (action === 'delete') return deleteAccount(req, res)
    return send(res, 404, { error: `Unknown account route: ${action}` })
  })
}

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

async function deleteAccount(req, res) {
  if (!methodGuard(req, res, ['POST'])) return

  const user = await requireUser(req, res)
  if (!user) return

  // Typing the address is a second factor against a stolen token: holding one
  // is enough to *use* the account, but should not be enough to erase it in a
  // single unattended request.
  const confirmEmail = (req.body?.confirmEmail || '').trim().toLowerCase()
  if (!confirmEmail || confirmEmail !== (user.email || '').toLowerCase()) {
    return send(res, 400, { error: 'Type your own email address to confirm.' })
  }

  /* ---- Workspaces this account owns ---- */

  const owned = await sql`
    SELECT o.id, o.name,
           (SELECT COUNT(*)::int FROM neon_auth.member m2 WHERE m2."organizationId" = o.id) AS member_count
    FROM neon_auth.member m
    JOIN neon_auth.organization o ON o.id = m."organizationId"
    WHERE m."userId" = ${user.id} AND m.role = 'owner'
  `

  // Deleting the owner of a shared workspace would strand everyone else in a
  // team nobody can administer, so that has to be resolved deliberately first.
  const shared = owned.filter((o) => o.member_count > 1)
  if (shared.length > 0) {
    return send(res, 409, {
      error:
        `You still own ${shared.length === 1 ? 'a workspace' : 'workspaces'} with other members: ` +
        `${shared.map((o) => o.name).join(', ')}. Transfer ownership or remove the other members first.`,
    })
  }

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
          'Could not stop your subscription with the payment provider. Nothing has been deleted — please try again.',
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
