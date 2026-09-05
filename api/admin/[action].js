import { send } from '../_lib/http.js'
import session from '../_lib/handlers/adminSession.js'
import overview from '../_lib/handlers/adminOverview.js'
import updates from '../_lib/handlers/adminUpdates.js'
import resources from '../_lib/handlers/adminResources.js'
import users from '../_lib/handlers/adminUsers.js'
import content from '../_lib/handlers/adminContent.js'
import moderation from '../_lib/handlers/adminModeration.js'

/**
 * One serverless function for the whole admin API.
 *
 * Vercel counts every file under /api as a separate deployed function, and the
 * Hobby plan allows twelve. Seven admin endpoints as seven files blew straight
 * past that, so the logic lives in _lib/handlers (underscore-prefixed paths are
 * excluded from routing) and this dispatches to it on the path segment.
 *
 * Each handler still runs its own requireAdmin() — routing through here changes
 * nothing about who is allowed in.
 */
const ROUTES = { session, overview, updates, resources, users, content, moderation }

export default async function handler(req, res) {
  const action = req.query?.action
  const route = ROUTES[action]
  if (!route) {
    return send(res, 404, { error: `Unknown admin route: ${action}` })
  }
  return route(req, res)
}
