import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { requireUser } from '../auth.js'
import { requireMembership, assertCanDownload, effectiveTier, requiredTierFor, TIER_RANK } from '../guard.js'
import { publicPreviewUrl, readObjectStart, SOURCE_BUCKET } from '../s3.js'
import { limit, LIMITS } from '../ratelimit.js'
import { MAX_TEMPLATE_PAGE_BYTES } from '../templateSvg.js'

/**
 * Featured templates for the Creative Suite.
 *
 * GET                    the templates Routicle has chosen to feature
 * POST { itemId }        use one: returns its pages, and counts as a download
 *
 * Using a template is paid exactly like downloading it, because in every way
 * that matters it is one: the subscriber took the creator's file and it made
 * something for them. So a use goes through the same paywall as a download
 * (assertCanDownload) and is recorded in the same `downloads` table the payout
 * pool is worked out from, marked source = 'template' so it can be told apart
 * in reporting.
 *
 * Tweaking colours or swapping the logo re-renders in the browser and never
 * comes back here. Opening the same template again within a day is not a new
 * use either, so refreshing a page can't be used to inflate a creator's count.
 */

const REUSE_WINDOW_HOURS = 24

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST'])) return
    const user = await requireUser(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const organizationId = req.query?.organizationId || null
      if (organizationId && !(await requireMembership(res, user.id, organizationId))) return
      const held = await effectiveTier(user.id, organizationId)

      const rows = await sql`
        SELECT c.id, c.title, c.description, c.template_kind, c.template_slots, c.is_free, c.file_types,
               c.department, c.thumbnail_key, c.thumbnail_webp_key, c.featured_at, cr.name AS creator_name, cr.id AS creator_id
        FROM content_items c
        JOIN creators cr ON cr.id = c.creator_id
        WHERE c.is_template AND c.is_featured AND c.moderation_status = 'approved'
        ORDER BY c.featured_at DESC NULLS LAST
        LIMIT 120
      `
      return send(res, 200, {
        tier: held,
        templates: rows.map((r) => {
          const needed = requiredTierFor(r)
          return {
            id: r.id,
            title: r.title,
            description: r.description || '',
            kind: r.template_kind,
            slots: r.template_slots?.summary || null,
            pageSizes: (r.template_slots?.pages || []).map((p) => ({ width: p.width, height: p.height })),
            free: r.is_free,
            requiredTier: needed,
            canUse: r.is_free || TIER_RANK[held] >= TIER_RANK[needed],
            image: r.thumbnail_key ? publicPreviewUrl(r.thumbnail_key) : null,
            imageWebp: r.thumbnail_webp_key ? publicPreviewUrl(r.thumbnail_webp_key) : null,
            creator: { id: r.creator_id, name: r.creator_name },
          }
        }),
      })
    }

    /* ------------------------------------------------------------- POST */

    if (!(await limit(req, res, { name: 'template-use', key: user.id, ...LIMITS.presign }))) return

    const { itemId, organizationId } = req.body || {}
    if (!itemId) return send(res, 400, { error: 'itemId is required' })
    if (organizationId && !(await requireMembership(res, user.id, organizationId))) return

    const rows = await sql`
      SELECT * FROM content_items
      WHERE id = ${itemId} AND is_template AND is_featured AND moderation_status = 'approved'
    `
    const item = rows[0]
    if (!item) return send(res, 404, { error: "That template isn't available." })

    // The same paywall as a download: 402 with the tier needed when not met.
    if (!(await assertCanDownload(res, { item, userId: user.id, organizationId }))) return

    const pages = []
    for (const entry of item.source_object_keys || []) {
      if (entry.label !== 'SVG') continue
      const size = Math.min(Number(entry.size) || MAX_TEMPLATE_PAGE_BYTES, MAX_TEMPLATE_PAGE_BYTES)
      const bytes = await readObjectStart({ bucket: SOURCE_BUCKET, key: entry.key, bytes: size })
      pages.push({ svg: new TextDecoder('utf-8', { fatal: false }).decode(bytes) })
    }
    if (!pages.length) return send(res, 404, { error: 'This template has no pages.' })

    // Counted once per person per template per day, like a download is once
    // per download: the row is what the payout pool is split by.
    const email = String(user.email).toLowerCase()
    const inserted = await sql`
      INSERT INTO downloads (content_item_id, user_email, organization_id, source)
      SELECT ${itemId}, ${email}, ${organizationId || null}, 'template'
      WHERE NOT EXISTS (
        SELECT 1 FROM downloads
        WHERE content_item_id = ${itemId} AND lower(user_email) = ${email} AND source = 'template'
          AND downloaded_at > now() - make_interval(hours => ${REUSE_WINDOW_HOURS})
      )
      RETURNING id
    `
    if (inserted.length) {
      await sql`UPDATE content_items SET download_count = download_count + 1 WHERE id = ${itemId}`
    }

    send(res, 200, { pages, counted: inserted.length > 0, slots: item.template_slots?.summary || null })
  })
}
