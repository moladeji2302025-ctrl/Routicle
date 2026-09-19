import { send } from '../_lib/http.js'
import creators from '../_lib/handlers/creators.js'
import submissions from '../_lib/handlers/submissions.js'
import presign from '../_lib/handlers/presign.js'
import { withCors } from '../_lib/cors.js'

/** Creator-side endpoints: profile upsert, submissions, and upload presigning. */
const ROUTES = { profile: creators, submissions, presign }

export default withCors(['GET', 'POST'], async function handler(req, res) {
  const route = ROUTES[req.query?.action]
  if (!route) return send(res, 404, { error: `Unknown creator route: ${req.query?.action}` })
  return route(req, res)
})
