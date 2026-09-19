import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { presignDownload, SOURCE_BUCKET } from '../s3.js'
import { requireUser } from '../auth.js'
import { requireMembership, assertCanDownload } from '../guard.js'
import { limit, LIMITS } from '../ratelimit.js'

/**
 * Presigned GET URLs for a content item's real source files — the paywalled
 * asset this whole product sells.
 *
 * Every decision here is made server-side from the verified session:
 *   · who is asking comes from the session, never from a `userEmail` field;
 *   · whether they may have the files is re-derived from the subscriptions
 *     table, not taken from the client;
 *   · reading a workspace's history requires being a member of it.
 *
 * POST                  issue URLs for one item
 * GET ?organizationId=  that workspace's shared history (members only)
 * GET                   the caller's own history
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST'])) return

    const user = await requireUser(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const { organizationId } = req.query || {}

      if (organizationId) {
        if (!(await requireMembership(res, user.id, organizationId))) return
        const rows = await sql`
          SELECT d.content_item_id, d.user_email, d.downloaded_at, c.title, c.thumbnail_key, c.department
          FROM downloads d
          JOIN content_items c ON c.id = d.content_item_id
          WHERE d.organization_id = ${organizationId}
          ORDER BY d.downloaded_at DESC
          LIMIT 100
        `
        return send(res, 200, { downloads: rows })
      }

      // Personal history only, and only ever the session's own — the email is
      // taken from the session so there is no id to tamper with. Team rows are
      // excluded: they belong to the workspace and stay visible there.
      const rows = await sql`
        SELECT d.content_item_id, d.user_email, d.downloaded_at, c.title, c.thumbnail_key, c.department
        FROM downloads d
        JOIN content_items c ON c.id = d.content_item_id
        WHERE lower(d.user_email) = ${String(user.email).toLowerCase()} AND d.organization_id IS NULL
        ORDER BY d.downloaded_at DESC
        LIMIT 100
      `
      return send(res, 200, { downloads: rows })
    }

    /* ------------------------------------------------------------- POST */

    if (!(await limit(req, res, { name: 'download', key: user.id, ...LIMITS.presign }))) return

    const { itemId, organizationId } = req.body || {}
    if (!itemId) return send(res, 400, { error: 'itemId is required' })

    // A workspace may only be credited for a download by one of its members.
    if (organizationId && !(await requireMembership(res, user.id, organizationId))) return

    const rows = await sql`
      SELECT * FROM content_items WHERE id = ${itemId} AND moderation_status = 'approved'
    `
    if (rows.length === 0) return send(res, 404, { error: 'not found' })
    const item = rows[0]

    // The paywall. Refuses with 402 and the tier needed when it is not met.
    if (!(await assertCanDownload(res, { item, userId: user.id, organizationId }))) return

    const sourceKeys = item.source_object_keys || []
    if (sourceKeys.length === 0) return send(res, 404, { error: 'no source files on this item' })

    const files = await Promise.all(
      sourceKeys.map(async (entry) => ({
        label: entry.label,
        url: await presignDownload({
          bucket: SOURCE_BUCKET,
          key: entry.key,
          downloadFileName: entry.name || `${item.title}-${entry.label}`,
        }),
      }))
    )

    // Whether this is the account's first ever download, for analytics.
    const email = String(user.email).toLowerCase()
    const [{ before }] = await sql`SELECT EXISTS (SELECT 1 FROM downloads WHERE lower(user_email) = ${email}) AS before`

    await sql`
      INSERT INTO downloads (content_item_id, user_email, organization_id)
      VALUES (${itemId}, ${String(user.email).toLowerCase()}, ${organizationId || null})
    `
    await sql`UPDATE content_items SET download_count = download_count + 1 WHERE id = ${itemId}`

    send(res, 200, { files, isFirst: !before })
  })
}
