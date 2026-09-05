import list from '../_lib/handlers/contentList.js'
import item from '../_lib/handlers/contentItem.js'

/**
 * Optional catch-all so /api/content and /api/content/:id share one function.
 * `id` arrives as an array of path segments, or undefined for the bare list.
 */
export default async function handler(req, res) {
  const segments = req.query?.id
  const id = Array.isArray(segments) ? segments[0] : segments

  if (!id) return list(req, res)

  // The per-item handler reads req.query.id as a plain string.
  req.query.id = id
  return item(req, res)
}
