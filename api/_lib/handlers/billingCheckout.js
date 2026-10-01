import crypto from 'crypto'
import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { initializeTransaction } from '../paystack.js'
import { priceFor, planCodeFor, TIERS, CYCLES } from '../plans.js'
import { requireUser } from '../auth.js'
import { limit, LIMITS } from '../ratelimit.js'

/**
 * Starts a subscription checkout.
 *
 * POST { userId, email, tier, billingCycle, organizationId?, returnUrl, acceptedRenewalTerms }
 *   -> { authorizationUrl, reference }
 *
 * The amount is resolved server-side from the tier/cycle (see _lib/plans.js);
 * the client never supplies a price. A pending row is written to
 * `transactions` first so an abandoned or failed payment is still auditable.
 *
 * `acceptedRenewalTerms` must be `true` — the renewal-disclosure checkbox on
 * the pricing page, required (California's Automatic Renewal Law) before any
 * paid checkout starts — and its timestamp is kept on the transaction row as
 * the record that it was shown and agreed to for that specific charge.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    // The buyer is the session user. Taking userId/email from the body let a
    // caller start a checkout that would activate somebody else's plan.
    const user = await requireUser(req, res)
    if (!user) return
    if (!(await limit(req, res, { name: 'checkout', key: user.id, ...LIMITS.write }))) return

    const userId = user.id
    const email = user.email
    const { tier, billingCycle, organizationId, returnUrl, acceptedRenewalTerms } = req.body || {}
    if (!TIERS.includes(tier)) return send(res, 400, { error: `tier must be one of ${TIERS.join(', ')}` })
    if (!CYCLES.includes(billingCycle)) return send(res, 400, { error: `billingCycle must be one of ${CYCLES.join(', ')}` })
    // California's Automatic Renewal Law: the renewal terms have to be shown
    // and separately agreed to before the charge, not just before clicking
    // Subscribe. Checked here, not just required in the client UI, so this
    // can't be skipped by calling the endpoint directly.
    if (acceptedRenewalTerms !== true) {
      return send(res, 400, { error: 'The renewal terms need to be acknowledged before starting checkout.' })
    }

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
      INSERT INTO transactions (reference, user_id, organization_id, tier, billing_cycle, amount_minor, currency, renewal_terms_accepted_at)
      VALUES (${reference}, ${userId}, ${organizationId || null}, ${tier}, ${billingCycle}, ${amountMinor}, ${currency}, now())
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
