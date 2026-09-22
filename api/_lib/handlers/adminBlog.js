import { sql } from '../db.js'
import { requireAdmin, logAdmin } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

function serialize(r) {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    body: r.body,
    coverUrl: r.cover_url,
    authorName: r.author_name,
    status: r.status,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** "Ten notes on file naming!" -> "ten-notes-on-file-naming". */
export function slugify(title) {
  return (
    String(title || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'post'
  )
}

/** A slug nobody else is using, adding -2, -3… when the plain one is taken. */
async function freeSlug(base, exceptId) {
  for (let n = 1; n < 50; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const rows = await sql`SELECT id FROM blog_posts WHERE slug = ${candidate} LIMIT 1`
    if (!rows[0] || rows[0].id === exceptId) return candidate
  }
  return `${base}-${Date.now()}`
}

function cleanUrl(u) {
  const v = String(u || '').trim()
  return /^https?:\/\//i.test(v) ? v.slice(0, 1000) : null
}

/**
 * The Routicle blog, from the marketing side. Drafts live here; the public
 * read (/api/public/blog) only ever returns published posts.
 *
 * GET     every post, newest first
 * POST    { title, excerpt?, body?, coverUrl?, authorName?, status? }
 * PATCH   { id, ...same fields, slug? }
 * DELETE  ?id=
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return
    const admin = await requireAdmin(req, res, ['marketing'])
    if (!admin) return

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM blog_posts ORDER BY COALESCE(published_at, created_at) DESC`
      return send(res, 200, { posts: rows.map(serialize) })
    }

    if (req.method === 'POST') {
      const { title, excerpt, body, coverUrl, authorName, status } = req.body || {}
      if (!String(title || '').trim()) return send(res, 400, { error: 'A title is required' })
      const published = status === 'published'
      const slug = await freeSlug(slugify(title))
      const rows = await sql`
        INSERT INTO blog_posts (slug, title, excerpt, body, cover_url, author_name, status, published_at, created_by)
        VALUES (
          ${slug}, ${String(title).trim().slice(0, 160)}, ${String(excerpt || '').trim().slice(0, 300)},
          ${String(body || '').slice(0, 60000)}, ${cleanUrl(coverUrl)},
          ${String(authorName || admin.name || '').trim().slice(0, 80) || null},
          ${published ? 'published' : 'draft'}, ${published ? new Date().toISOString() : null}, ${admin.id}
        )
        RETURNING *
      `
      await logAdmin(admin, 'blog.create', rows[0].slug, { status: rows[0].status })
      return send(res, 201, { post: serialize(rows[0]) })
    }

    if (req.method === 'PATCH') {
      const { id, title, excerpt, body, coverUrl, authorName, status, slug } = req.body || {}
      if (!id) return send(res, 400, { error: 'id is required' })
      const current = (await sql`SELECT * FROM blog_posts WHERE id = ${id}`)[0]
      if (!current) return send(res, 404, { error: 'That post no longer exists' })

      const nextTitle = title !== undefined ? String(title).trim().slice(0, 160) : current.title
      if (!nextTitle) return send(res, 400, { error: 'A title is required' })
      // A published post keeps its address unless someone asks to change it:
      // links that are already out there shouldn't break on an edit.
      const nextSlug = slug ? await freeSlug(slugify(slug), id) : current.slug
      const nextStatus = status === 'published' || status === 'draft' ? status : current.status
      const publishedAt =
        nextStatus === 'published' ? current.published_at || new Date().toISOString() : current.published_at

      const rows = await sql`
        UPDATE blog_posts SET
          slug = ${nextSlug},
          title = ${nextTitle},
          excerpt = ${excerpt !== undefined ? String(excerpt).trim().slice(0, 300) : current.excerpt},
          body = ${body !== undefined ? String(body).slice(0, 60000) : current.body},
          cover_url = ${coverUrl !== undefined ? cleanUrl(coverUrl) : current.cover_url},
          author_name = ${authorName !== undefined ? String(authorName).trim().slice(0, 80) || null : current.author_name},
          status = ${nextStatus},
          published_at = ${publishedAt},
          updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `
      if (nextStatus !== current.status) await logAdmin(admin, `blog.${nextStatus === 'published' ? 'publish' : 'unpublish'}`, rows[0].slug)
      return send(res, 200, { post: serialize(rows[0]) })
    }

    const { id } = req.query || {}
    if (!id) return send(res, 400, { error: 'id is required' })
    const gone = await sql`DELETE FROM blog_posts WHERE id = ${id} RETURNING slug`
    if (gone[0]) await logAdmin(admin, 'blog.delete', gone[0].slug)
    return send(res, 200, { ok: true })
  })
}
