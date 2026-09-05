import { sql } from '../_lib/db.js'
import { requireAdmin } from '../_lib/auth.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'

/** Platform-wide numbers for the admin dashboard — real counts, one round trip each. */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return

    const admin = await requireAdmin(req, res)
    if (!admin) return

    const [
      users,
      creators,
      content,
      pending,
      downloads,
      subs,
      orgs,
      folders,
      updates,
      resources,
      recentDownloads,
      recentSubmissions,
    ] = await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM neon_auth."user"`,
      sql`SELECT COUNT(*)::int AS n FROM creators`,
      sql`SELECT COUNT(*)::int AS n FROM content_items WHERE moderation_status = 'approved'`,
      sql`SELECT COUNT(*)::int AS n FROM content_items WHERE moderation_status = 'pending'`,
      sql`SELECT COUNT(*)::int AS n FROM downloads`,
      sql`SELECT tier, COUNT(*)::int AS n FROM subscriptions WHERE status = 'active' GROUP BY tier`,
      sql`SELECT COUNT(*)::int AS n FROM neon_auth.organization`,
      sql`SELECT COUNT(*)::int AS n FROM team_folders`,
      sql`SELECT COUNT(*) FILTER (WHERE is_published)::int AS published, COUNT(*) FILTER (WHERE NOT is_published)::int AS drafts FROM app_updates`,
      sql`SELECT COUNT(*)::int AS n FROM app_resources`,
      sql`SELECT d.downloaded_at, d.user_email, c.title FROM downloads d JOIN content_items c ON c.id = d.content_item_id ORDER BY d.downloaded_at DESC LIMIT 8`,
      sql`SELECT c.id, c.title, c.created_at, cr.name AS creator_name FROM content_items c JOIN creators cr ON cr.id = c.creator_id WHERE c.moderation_status = 'pending' ORDER BY c.created_at DESC LIMIT 8`,
    ])

    send(res, 200, {
      counts: {
        users: users[0].n,
        creators: creators[0].n,
        liveContent: content[0].n,
        pendingContent: pending[0].n,
        downloads: downloads[0].n,
        teams: orgs[0].n,
        folders: folders[0].n,
        publishedUpdates: updates[0].published,
        draftUpdates: updates[0].drafts,
        resources: resources[0].n,
      },
      subscriptionsByTier: subs.map((r) => ({ tier: r.tier, count: r.n })),
      recentDownloads: recentDownloads.map((r) => ({
        title: r.title,
        userEmail: r.user_email,
        at: r.downloaded_at,
      })),
      recentSubmissions: recentSubmissions.map((r) => ({
        id: r.id,
        title: r.title,
        creatorName: r.creator_name,
        at: r.created_at,
      })),
    })
  })
}
