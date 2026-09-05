import { sql } from './_lib/db.js'
import { send, methodGuard, withErrorHandling } from './_lib/http.js'

/**
 * Public "What's new" feed. Read-only and unauthenticated by design — this is
 * the same list every visitor sees. Drafts never leave the admin endpoint.
 *
 * GET ?limit=  published updates, pinned first then newest.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return

    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20))
    const rows = await sql`
      SELECT id, title, body, category, is_pinned, link_url, link_label, published_at
      FROM app_updates
      WHERE is_published
      ORDER BY is_pinned DESC, published_at DESC
      LIMIT ${limit}
    `

    send(res, 200, {
      updates: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        category: r.category,
        isPinned: r.is_pinned,
        linkUrl: r.link_url,
        linkLabel: r.link_label,
        publishedAt: r.published_at,
      })),
    })
  })
}
