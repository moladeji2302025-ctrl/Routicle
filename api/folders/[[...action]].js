import list from '../_lib/handlers/foldersList.js'
import items from '../_lib/handlers/folderItems.js'

/**
 * /api/folders        -> the team's folders
 * /api/folders/items  -> one folder's contents
 *
 * Optional catch-all, not [action]: a bare /api/folders has no segment to match,
 * so [action].js alone would 404 the folder list.
 */
export default async function handler(req, res) {
  const segments = req.query?.action
  const action = Array.isArray(segments) ? segments[0] : segments
  return action === 'items' ? items(req, res) : list(req, res)
}
