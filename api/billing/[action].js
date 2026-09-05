import { send } from '../_lib/http.js'
import checkout from '../_lib/handlers/billingCheckout.js'
import verify from '../_lib/handlers/billingVerify.js'
import subscription from '../_lib/handlers/billingSubscription.js'

/**
 * Checkout, verify and subscription behind one function (see the note in
 * admin/[action].js about Vercel's function budget).
 *
 * `webhook.js` deliberately stays its own file: it needs
 * `config.api.bodyParser = false` to verify Paystack's signature over the raw
 * body, and that config would apply to every route sharing the function.
 * Static routes win over dynamic ones, so /api/billing/webhook still lands there.
 */
const ROUTES = { checkout, verify, subscription }

export default async function handler(req, res) {
  const action = req.query?.action
  const route = ROUTES[action]
  if (!route) {
    return send(res, 404, { error: `Unknown billing route: ${action}` })
  }
  return route(req, res)
}
