/**
 * Authorization and entitlement, decided on the server.
 *
 * The rule this module exists to enforce: an endpoint never learns *who is
 * asking* from the request body or query string. Identity comes from the
 * verified session (see auth.js) and nothing else. Every helper here therefore
 * takes a session user, not an id a caller supplied.
 *
 * Entitlement is re-derived here rather than trusted from the client. The
 * browser also computes it, in src/data/pricing.js, so the download button can
 * show the right state — but that copy is a convenience for rendering, and
 * this one is the decision.
 */

import { sql } from './db.js'
import { send } from './http.js'

/* ------------------------------------------------------------ memberships */

/** That user's role in the workspace, or null when they are not a member. */
export async function orgRole(userId, organizationId) {
  if (!organizationId) return null
  const rows = await sql`
    SELECT role FROM neon_auth.member
    WHERE "organizationId" = ${organizationId} AND "userId" = ${userId}
    LIMIT 1
  `
  return rows[0]?.role || null
}

/**
 * Resolves to the caller's role in the workspace, or sends 403 and resolves to
 * null. Guards every read and write scoped to an organizationId — without it,
 * passing someone else's workspace id is enough to read their shared
 * collections and download history.
 */
export async function requireMembership(res, userId, organizationId) {
  const role = await orgRole(userId, organizationId)
  if (!role) {
    send(res, 403, { error: 'You are not a member of that workspace' })
    return null
  }
  return role
}

/** As above, but only an owner or admin passes. */
export async function requireOrgAdmin(res, userId, organizationId) {
  const role = await requireMembership(res, userId, organizationId)
  if (!role) return null
  if (role !== 'owner' && role !== 'admin') {
    send(res, 403, { error: 'Only a workspace owner or admin can do that' })
    return null
  }
  return role
}

/* ------------------------------------------------------------ entitlement */

export const TIER_RANK = { free: 0, standard: 1, express: 2 }

const EXPRESS_FORMATS = ['AEP', 'PPRO']

/**
 * The tier an item's source files sit behind. Mirrors requiredTier() in
 * src/data/pricing.js, against the database's own column names.
 */
export function requiredTierFor(item) {
  const types = item.file_types || []
  if (types.some((f) => EXPRESS_FORMATS.includes(String(f).toUpperCase()))) return 'express'
  if (types.length > 0) return 'standard'
  if (item.department === 'ai-video') return 'express'
  return 'standard'
}

/**
 * The best tier this caller actually holds: their own plan, or the active
 * workspace's plan when they are a member of it.
 *
 * Read from the subscriptions table, never from the request — a client that
 * says it is on Express is just a client saying so.
 */
export async function effectiveTier(userId, organizationId) {
  const rows = organizationId
    ? await sql`
        SELECT s.tier
        FROM subscriptions s
        WHERE s.status = 'active'
          AND (
            (s.user_id = ${userId} AND s.organization_id IS NULL)
            OR (
              s.organization_id = ${organizationId}
              AND EXISTS (
                SELECT 1 FROM neon_auth.member m
                WHERE m."organizationId" = ${organizationId} AND m."userId" = ${userId}
              )
            )
          )
      `
    : await sql`
        SELECT tier FROM subscriptions
        WHERE user_id = ${userId} AND organization_id IS NULL AND status = 'active'
      `

  let best = 'free'
  for (const row of rows) {
    if ((TIER_RANK[row.tier] ?? 0) > TIER_RANK[best]) best = row.tier
  }
  return best
}

/** True when a one-off purchase already covers this item for this user. */
async function hasPurchased(userId, itemId) {
  const rows = await sql`
    SELECT 1 FROM downloads
    WHERE content_item_id = ${itemId} AND purchased_by_user_id = ${userId}
    LIMIT 1
  `
  return rows.length > 0
}

/**
 * Decides whether this caller may have the real source files, and sends the
 * matching refusal if not.
 *
 * Returns true only when entitled. The `purchased_by_user_id` lookup is
 * tolerated as optional: on a schema where pay-per-download was never wired up
 * the column may not exist, and a missing column must fail closed (no access)
 * rather than throwing a 500 that a caller could read as a hint.
 */
export async function assertCanDownload(res, { item, userId, organizationId }) {
  if (item.is_free) return true

  const needed = requiredTierFor(item)
  const held = await effectiveTier(userId, organizationId)

  if (TIER_RANK[held] >= TIER_RANK[needed]) return true

  let purchased = false
  try {
    purchased = await hasPurchased(userId, item.id)
  } catch {
    purchased = false
  }
  if (purchased) return true

  send(res, 402, {
    error:
      held === 'free'
        ? 'The source files for this piece are available on a paid plan.'
        : `This piece needs the ${needed} plan.`,
    requiredTier: needed,
  })
  return false
}

/* ------------------------------------------------------------- ownership */

/**
 * The creator record belonging to this session user, or null.
 *
 * Creator identity is resolved from the session's email rather than from a
 * `creatorEmail` field in the body — otherwise anyone could upload into anyone
 * else's storage quota and have it attributed to them.
 */
export async function creatorFor(user) {
  const rows = await sql`
    SELECT id, email, storage_bytes FROM creators WHERE lower(email) = ${String(user.email || '').toLowerCase()} LIMIT 1
  `
  return rows[0] || null
}

export async function requireCreator(res, user) {
  const creator = await creatorFor(user)
  if (!creator) {
    send(res, 403, { error: 'Apply as a creator first' })
    return null
  }
  return creator
}
