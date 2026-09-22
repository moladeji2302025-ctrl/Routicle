import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

/**
 * The public blog. Unauthenticated and read-only; drafts never leave the
 * admin endpoint.
 *
 * GET               published posts, newest first (no body)
 * GET ?slug=        one published post, with its body
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')

    const slug = String(req.query?.slug || '').trim()
    if (slug) {
      const rows = await sql`
        SELECT slug, title, excerpt, body, cover_url, author_name, published_at, updated_at
        FROM blog_posts WHERE slug = ${slug} AND status = 'published' LIMIT 1
      `
      const r = rows[0]
      if (!r) return send(res, 404, { error: 'That post was not found' })
      return send(res, 200, {
        post: {
          slug: r.slug,
          title: r.title,
          excerpt: r.excerpt,
          body: r.body,
          coverUrl: r.cover_url,
          authorName: r.author_name,
          publishedAt: r.published_at,
          updatedAt: r.updated_at,
        },
      })
    }

    const rows = await sql`
      SELECT slug, title, excerpt, cover_url, author_name, published_at
      FROM blog_posts WHERE status = 'published'
      ORDER BY published_at DESC LIMIT 50
    `
    send(res, 200, {
      posts: rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        coverUrl: r.cover_url,
        authorName: r.author_name,
        publishedAt: r.published_at,
      })),
    })
  })
}
