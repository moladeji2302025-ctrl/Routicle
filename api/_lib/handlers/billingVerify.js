import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { verifyTransaction } from '../paystack.js'
import { activateFromTransaction, serializeSubscription } from '../billing.js'
import { requireUser } from '../auth.js'
import { orgRole } from '../guard.js'
import { limit, LIMITS } from '../ratelimit.js'

/**
 * Confirms a checkout after the buyer returns from Paystack.
 *
 * POST { reference } -> { status, subscription }
 *
 * The webhook is the authoritative path (it fires even if the buyer closes the
 * tab), but browsers come back here first, so this runs the same idempotent
 * activation to avoid a confusing gap where payment succeeded and the UI
 * hasn't caught up.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    const user = await requireUser(req, res)
    if (!user) return
    if (!(await limit(req, res, { name: 'verify', key: user.id, ...LIMITS.write }))) return

    const { reference } = req.body || {}
    if (!reference) return send(res, 400, { error: 'reference is required' })

    const local = await sql`SELECT * FROM transactions WHERE reference = ${reference}`
    if (local.length === 0) return send(res, 404, { error: 'Unknown transaction reference' })
    const txn = local[0]

    // The reference must be this caller's own — their personal transaction, or
    // one belonging to a workspace they are in. Without this, a reference is a
    // bearer token: anyone holding one could read back the resulting
    // subscription, and guessing at them enumerated which references exist.
    const ownsIt =
      txn.user_id === user.id ||
      (txn.organization_id ? Boolean(await orgRole(user.id, txn.organization_id)) : false)
    if (!ownsIt) return send(res, 404, { error: 'Unknown transaction reference' })

    const data = await verifyTransaction(reference)

    if (data.status !== 'success') {
      await sql`UPDATE transactions SET status = 'failed' WHERE reference = ${reference} AND status = 'pending'`
      return send(res, 200, { status: data.status, subscription: null })
    }

    // Never trust the gateway's echo alone — the charge must match what we
    // recorded when the checkout was created.
    if (Number(data.amount) !== Number(txn.amount_minor) || data.currency !== txn.currency) {
      console.error('Paystack amount mismatch', { reference, expected: txn.amount_minor, got: data.amount })
      return send(res, 409, { error: 'Payment amount did not match the plan price' })
    }

    const subscription = await activateFromTransaction(reference, data)
    send(res, 200, { status: 'success', subscription: serializeSubscription(subscription) })
  })
}
