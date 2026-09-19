import { send } from '../_lib/http.js'
import updates from '../_lib/handlers/publicUpdates.js'
import resources from '../_lib/handlers/publicResources.js'
import sitemap from '../_lib/handlers/sitemap.js'
import newsletter from '../_lib/handlers/newsletter.js'
import { withCors } from '../_lib/cors.js'

/**
 * The unauthenticated reads: /api/public/updates, /api/public/resources and
 * /api/public/sitemap (served at /sitemap.xml). All only ever expose published
 * rows; drafts stay behind the admin API.
 *
 * /api/public/newsletter is the one write: a logged-out visitor signing up
 * for email updates. It is the only route here that accepts POST.
 */
const ROUTES = { updates, resources, sitemap, newsletter }

export default withCors(['GET', 'POST'], async function handler(req, res) {
  const route = ROUTES[req.query?.resource]
  if (!route) {
    return send(res, 404, { error: `Unknown public route: ${req.query?.resource}` })
  }
  if (req.method === 'POST' && route !== newsletter) return send(res, 405, { error: 'Method not allowed' })
  return route(req, res)
})
