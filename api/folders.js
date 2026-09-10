import list from './_lib/handlers/foldersList.js'
import items from './_lib/handlers/folderItems.js'

/**
 * /api/folders               -> the team's folders
 * /api/folders?scope=items   -> one folder's contents
 *
 * A flat file with a query param, not folders/[[...action]].js: Vercel's plain
 * /api directory does not route a bare /api/folders to an optional catch-all
 * the way Next.js does, so the folder list 404'd.
 */
export default async function handler(req, res) {
  return req.query?.scope === 'items' ? items(req, res) : list(req, res)
}
