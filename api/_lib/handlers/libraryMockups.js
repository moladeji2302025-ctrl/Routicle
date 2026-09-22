import { sql } from '../db.js'
import { requireUser } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { publicPreviewUrl } from '../s3.js'

/**
 * The published mockup-template photos, for any signed-in user's Mockup
 * Studio. Read-only, no admin check — the curation gate is `is_published`.
 *
 * GET   every published template
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return
    const user = await requireUser(req, res)
    if (!user) return

    const rows = await sql`
      SELECT id, title, category, image_key, width, height
      FROM mockup_templates
      WHERE is_published
      ORDER BY category, sort_order, created_at
    `
    send(res, 200, {
      templates: rows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        image: publicPreviewUrl(r.image_key),
        width: r.width,
        height: r.height,
      })),
    })
  })
}
