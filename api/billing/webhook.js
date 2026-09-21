import { sql } from '../_lib/db.js'
import { send, withErrorHandling } from '../_lib/http.js'
import { isValidWebhookSignature } from '../_lib/paystack.js'
import { activateFromTransaction } from '../_lib/billing.js'
import { notifyPaymentFailed, notifyCanceled } from '../_lib/email/index.js'
import { withCors } from '../_lib/cors.js'

// Signature verification needs the exact bytes Paystack signed, so the
// framework must not parse (and re-serialize) the body first.
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Paystack webhook. This is the source of truth for billing state: it fires
 * whether or not the buyer's browser makes it back to the callback page, and
 * it's how renewals and failures arrive for recurring subscriptions.
 *
 * Point your Paystack dashboard's webhook URL at /api/billing/webhook.
 */
export default withCors(['POST'], async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

    const raw = await readRawBody(req)
    if (!isValidWebhookSignature(raw, req.headers['x-paystack-signature'])) {
      return send(res, 401, { error: 'Invalid signature' })
    }

    const event = JSON.parse(raw)
    const data = event.data || {}

    switch (event.event) {
      case 'charge.success': {
        if (data.reference) await activateFromTransaction(data.reference, data)
        break
      }

      // A recurring subscription renewed: extend the period we're tracking.
      case 'invoice.payment_succeeded':
      case 'invoice.update': {
        const code = data.subscription?.subscription_code
        const nextPaymentDate = data.subscription?.next_payment_date
        if (code && nextPaymentDate) {
          await sql`
            UPDATE subscriptions
            SET current_period_end = ${new Date(nextPaymentDate).toISOString()}, status = 'active', updated_at = now()
            WHERE provider_subscription_code = ${code}
          `
        }
        break
      }

      case 'invoice.payment_failed': {
        const code = data.subscription?.subscription_code
        if (code) {
          await sql`
            UPDATE subscriptions SET status = 'past_due', updated_at = now()
            WHERE provider_subscription_code = ${code} AND status = 'active'
          `
          await notifyPaymentFailed({ subscriptionCode: code })
        }
        break
      }

      case 'subscription.disable':
      case 'subscription.not_renew': {
        if (data.subscription_code) {
          const rows = await sql`
            UPDATE subscriptions SET status = 'canceled', updated_at = now()
            WHERE provider_subscription_code = ${data.subscription_code}
            RETURNING id, user_id, tier, current_period_end
          `
          if (rows[0]) {
            await notifyCanceled({
              subscriptionId: rows[0].id,
              userId: rows[0].user_id,
              tier: rows[0].tier,
              accessUntil: rows[0].current_period_end,
            })
          }
        }
        break
      }

      default:
        break
    }

    // Always 200 on a verified event — anything else makes Paystack retry.
    send(res, 200, { received: true })
  })
})
