import list from './_lib/handlers/contentList.js'
import item from './_lib/handlers/contentItem.js'
import { withCors } from './_lib/cors.js'

/**
 * /api/content       -> the approved library
 * /api/content?id=   -> one item (PATCH)
 *
 * Same reason as folders.js: a bare /api/content is not matched by an optional
 * catch-all here, so the id moved from a path segment to a query param.
 */
export default withCors(['GET', 'PATCH'], async function handler(req, res) {
  return req.query?.id ? item(req, res) : list(req, res)
})
