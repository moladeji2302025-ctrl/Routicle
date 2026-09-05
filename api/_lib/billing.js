import { sql } from './db.js'
import { periodEndFrom } from './plans.js'

/**
 * Marks a transaction paid and turns it into an active subscription.
 * Idempotent: replaying the same reference (a webhook retry, or the buyer
 * refreshing the callback page) won't stack duplicate subscriptions.
 *
 * Returns the active subscription row, or null if the reference is unknown.
 */
export async function activateFromTransaction(reference, paystackData = {}) {
  const rows = await sql`SELECT * FROM transactions WHERE reference = ${reference}`
  const txn = rows[0]
  if (!txn) return null

  const paidAt = paystackData.paid_at ? new Date(paystackData.paid_at) : new Date()

  if (txn.status !== 'success') {
    await sql`
      UPDATE transactions
      SET status = 'success',
          provider_reference = ${paystackData.id ? String(paystackData.id) : null},
          paid_at = ${paidAt.toISOString()}
      WHERE reference = ${reference}
    `
  }

  // A given scope (personal, or one team) has at most one active subscription.
  if (txn.organization_id) {
    await sql`
      UPDATE subscriptions SET status = 'canceled', updated_at = now()
      WHERE organization_id = ${txn.organization_id} AND status = 'active'
    `
  } else {
    await sql`
      UPDATE subscriptions SET status = 'canceled', updated_at = now()
      WHERE user_id = ${txn.user_id} AND organization_id IS NULL AND status = 'active'
    `
  }

  const periodEnd = periodEndFrom(paidAt, txn.billing_cycle)
  const inserted = await sql`
    INSERT INTO subscriptions (
      user_id, organization_id, tier, billing_cycle, status,
      provider_customer_code, provider_subscription_code, provider_email_token, current_period_end
    )
    VALUES (
      ${txn.user_id}, ${txn.organization_id}, ${txn.tier}, ${txn.billing_cycle}, 'active',
      ${paystackData.customer?.customer_code || null},
      ${paystackData.subscription_code || null},
      ${paystackData.email_token || null},
      ${periodEnd.toISOString()}
    )
    RETURNING *
  `
  return inserted[0]
}

/** The subscription in force for a scope: a team's plan, or the user's own. */
export async function activeSubscription({ userId, organizationId }) {
  const rows = organizationId
    ? await sql`SELECT * FROM subscriptions WHERE organization_id = ${organizationId} AND status = 'active' LIMIT 1`
    : await sql`SELECT * FROM subscriptions WHERE user_id = ${userId} AND organization_id IS NULL AND status = 'active' LIMIT 1`
  return rows[0] || null
}

export function serializeSubscription(row) {
  if (!row) return null
  return {
    id: row.id,
    tier: row.tier,
    billingCycle: row.billing_cycle,
    status: row.status,
    organizationId: row.organization_id,
    currentPeriodEnd: row.current_period_end,
    isRecurring: Boolean(row.provider_subscription_code),
  }
}
