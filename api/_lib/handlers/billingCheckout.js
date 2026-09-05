import crypto from 'crypto'
import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { initializeTransaction } from '../paystack.js'
import { priceFor, planCodeFor, TIERS, CYCLES } from '../plans.js'

/**
 * Starts a subscription checkout.
 *
 * POST { userId, email, tier, billingCycle, organizationId?, returnUrl }
 *   -> { authorizationUrl, reference }
 *
 * The amount is resolved server-side from the tier/cycle (see _lib/plans.js);
 * the client never supplies a price. A pending row is written to
 * `transactions` first so an abandoned or failed payment is still auditable.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    const { userId, email, tier, billingCycle, organizationId, returnUrl } = req.body || {}
    if (!userId || !email) return send(res, 400, { error: 'userId and email are required' })
    if (!TIERS.includes(tier)) return send(res, 400, { error: `tier must be one of ${TIERS.join(', ')}` })
    if (!CYCLES.includes(billingCycle)) return send(res, 400, { error: `billingCycle must be one of ${CYCLES.join(', ')}` })

    // Only a team's owner/admin may buy a plan on the team's behalf.
    if (organizationId) {
      const rows = await sql`
        SELECT role FROM neon_auth.member
        WHERE "organizationId" = ${organizationId} AND "userId" = ${userId}
      `
      const role = rows[0]?.role
      if (!role) return send(res, 403, { error: 'You are not a member of that team' })
      if (role !== 'owner' && role !== 'admin') {
        return send(res, 403, { error: 'Only a team owner or admin can change the team plan' })
      }
    }

    const { currency, amountMinor } = priceFor(tier, billingCycle)
    const reference = `rtcl_${crypto.randomBytes(12).toString('hex')}`

    await sql`
      INSERT INTO transactions (reference, user_id, organization_id, tier, billing_cycle, amount_minor, currency)
      VALUES (${reference}, ${userId}, ${organizationId || null}, ${tier}, ${billingCycle}, ${amountMinor}, ${currency})
    `

    const origin = req.headers.origin || `https://${req.headers.host}`
    const callbackUrl = `${origin}/billing/callback`

    const data = await initializeTransaction({
      email,
      amountMinor,
      reference,
      currency,
      callbackUrl,
      planCode: planCodeFor(tier, billingCycle),
      metadata: { userId, tier, billingCycle, organizationId: organizationId || null, returnUrl: returnUrl || '/account' },
    })

    send(res, 200, { authorizationUrl: data.authorization_url, reference })
  })
}
