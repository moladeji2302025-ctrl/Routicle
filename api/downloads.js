import { sql } from './_lib/db.js'
import { send, methodGuard, withErrorHandling } from './_lib/http.js'
import { presignDownload, SOURCE_BUCKET } from './_lib/s3.js'

/**
 * Issues short-lived presigned GET URLs for a content item's real source files.
 * Entitlement (tier/paywall) is decided client-side same as the rest of this prototype's
 * mocked auth — this endpoint trusts the caller already ran evaluateDownload().
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    const { itemId, userEmail } = req.body || {}
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

    await sql`INSERT INTO downloads (content_item_id, user_email) VALUES (${itemId}, ${userEmail.toLowerCase().trim()})`
    await sql`UPDATE content_items SET download_count = download_count + 1 WHERE id = ${itemId}`

    send(res, 200, { files })
  })
}
