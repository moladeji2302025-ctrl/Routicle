import { send } from '../_lib/http.js'
import collections from '../_lib/handlers/collections.js'
import downloads from '../_lib/handlers/downloads.js'
import comments from '../_lib/handlers/comments.js'

/**
 * Saved items, download history and comments behind one function. Vercel counts every
 * file under /api as its own deployed function and the plan allows twelve, so
 * related endpoints share a dispatcher rather than each costing a slot.
 */
const ROUTES = { collections, downloads, comments }

export default async function handler(req, res) {
  const route = ROUTES[req.query?.resource]
  if (!route) return send(res, 404, { error: `Unknown library route: ${req.query?.resource}` })
  return route(req, res)
}
