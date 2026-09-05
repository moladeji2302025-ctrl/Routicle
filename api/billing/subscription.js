import { sql } from '../_lib/db.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'
import { disableSubscription } from '../_lib/paystack.js'
import { activeSubscription, serializeSubscription } from '../_lib/billing.js'

/**
 * GET    ?userId=&organizationId=   the subscription currently in force
 * DELETE ?userId=&organizationId=   cancel it (stays active until period end)
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'DELETE'])) return

    const { userId, organizationId } = req.query || {}
    if (!userId) return send(res, 400, { error: 'userId is required' })

    if (req.method === 'GET') {
      const sub = await activeSubscription({ userId, organizationId })
      return send(res, 200, { subscription: serializeSubscription(sub) })
    }

    // Cancelling a team plan is limited to its owner/admin.
    if (organizationId) {
      const rows = await sql`
        SELECT role FROM neon_auth.member
        WHERE "organizationId" = ${organizationId} AND "userId" = ${userId}
      `
      const role = rows[0]?.role
      if (role !== 'owner' && role !== 'admin') {
        return send(res, 403, { error: 'Only a team owner or admin can cancel the team plan' })
      }
    }

    const sub = await activeSubscription({ userId, organizationId })
    if (!sub) return send(res, 404, { error: 'No active subscription' })

    // Stop future billing at the gateway, if this is a real recurring plan.
    if (sub.provider_subscription_code && sub.provider_email_token) {
      try {
        await disableSubscription({ code: sub.provider_subscription_code, token: sub.provider_email_token })
      } catch (err) {
        console.error('Paystack disable failed', err)
        return send(res, 502, { error: 'Could not cancel with the payment provider. Nothing was changed.' })
      }
    }

    // Access is already paid for through the end of the current period.
    await sql`UPDATE subscriptions SET status = 'canceled', updated_at = now() WHERE id = ${sub.id}`

    send(res, 200, { canceled: true, accessUntil: sub.current_period_end })
  })
}
