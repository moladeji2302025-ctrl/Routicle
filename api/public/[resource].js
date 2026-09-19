import { send } from '../_lib/http.js'
import updates from '../_lib/handlers/publicUpdates.js'
import resources from '../_lib/handlers/publicResources.js'
import { withCors } from '../_lib/cors.js'

/**
 * The unauthenticated reads: /api/public/updates and /api/public/resources.
 * Both only ever return published rows; drafts stay behind the admin API.
 */
const ROUTES = { updates, resources }

export default withCors(['GET'], async function handler(req, res) {
  const route = ROUTES[req.query?.resource]
  if (!route) {
    return send(res, 404, { error: `Unknown public route: ${req.query?.resource}` })
  }
  return route(req, res)
})
