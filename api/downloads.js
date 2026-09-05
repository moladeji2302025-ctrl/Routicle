import { sql } from './_lib/db.js'
import { send, methodGuard, withErrorHandling } from './_lib/http.js'
import { presignDownload, SOURCE_BUCKET } from './_lib/s3.js'

/**
 * POST issues short-lived presigned GET URLs for a content item's real source
 * files. Entitlement (tier/paywall) is decided client-side same as the rest
 * of this prototype's mocked auth — this endpoint trusts the caller already
 * ran evaluateDownload().
 *
 * GET ?organizationId=  returns a team's shared download history.
 * GET ?userEmail=       returns that person's own history (rows with no team).
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST'])) return

    if (req.method === 'GET') {
      const { organizationId, userEmail } = req.query || {}
      if (!organizationId && !userEmail) {
        return send(res, 400, { error: 'organizationId or userEmail is required' })
      }

      // Personal history deliberately excludes team rows: those belong to the
      // workspace and stay visible there, not in someone's private list.
      const rows = organizationId
        ? await sql`
            SELECT d.content_item_id, d.user_email, d.downloaded_at, c.title, c.thumbnail_key, c.department
            FROM downloads d
            JOIN content_items c ON c.id = d.content_item_id
            WHERE d.organization_id = ${organizationId}
            ORDER BY d.downloaded_at DESC
            LIMIT 100
          `
        : await sql`
            SELECT d.content_item_id, d.user_email, d.downloaded_at, c.title, c.thumbnail_key, c.department
            FROM downloads d
            JOIN content_items c ON c.id = d.content_item_id
            WHERE d.user_email = ${userEmail.toLowerCase().trim()} AND d.organization_id IS NULL
            ORDER BY d.downloaded_at DESC
            LIMIT 100
          `
      return send(res, 200, { downloads: rows })
    }

    const { itemId, userEmail, organizationId } = req.body || {}
    if (!itemId || !userEmail) return send(res, 400, { error: 'itemId and userEmail are required' })

    const rows = await sql`SELECT * FROM content_items WHERE id = ${itemId} AND moderation_status = 'approved'`
    if (rows.length === 0) return send(res, 404, { error: 'not found' })
    const item = rows[0]

    const sourceKeys = item.source_object_keys || []
    if (sourceKeys.length === 0) return send(res, 404, { error: 'no source files on this item' })

    const files = await Promise.all(
      sourceKeys.map(async (entry) => ({
        label: entry.label,
        url: await presignDownload({
          bucket: SOURCE_BUCKET,
          key: entry.key,
          downloadFileName: `${item.title}-${entry.label}`,
        }),
      }))
    )

    await sql`INSERT INTO downloads (content_item_id, user_email, organization_id) VALUES (${itemId}, ${userEmail.toLowerCase().trim()}, ${organizationId || null})`
    await sql`UPDATE content_items SET download_count = download_count + 1 WHERE id = ${itemId}`

    send(res, 200, { files })
  })
}
