import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { getSession, requireUser, isAdminUser } from '../auth.js'
import { limit, LIMITS } from '../ratelimit.js'

/**
 * Comments and reviews on a piece of work.
 *
 * A review is a comment carrying a 1–5 rating; without one it is a plain
 * comment. Reading is public, because the reviews are part of what makes a
 * piece worth downloading. Everything else needs a session, and the author of
 * a row is always taken from that session rather than from the body.
 *
 * GET    ?itemId=            the thread, plus the rating summary
 * POST   { itemId, body, rating? }
 * PATCH  { id, body, rating? }   author only
 * DELETE ?id=                    author, or an admin
 */

const MAX = 2000

function shape(row, viewerId, viewerIsAdmin) {
  return {
    id: row.id,
    body: row.body,
    rating: row.rating,
    authorName: row.author_name,
    authorImage: row.author_image,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    isMine: Boolean(viewerId) && row.user_id === viewerId,
    canDelete: (Boolean(viewerId) && row.user_id === viewerId) || viewerIsAdmin,
  }
}

/** Validates the two fields a caller controls. Returns an error string or null. */
function validate({ body, rating }) {
  const text = typeof body === 'string' ? body.trim() : ''
  if (!text) return 'Write something first.'
  if (text.length > MAX) return `Keep it under ${MAX} characters.`
  if (rating !== null && rating !== undefined) {
    const n = Number(rating)
    if (!Number.isInteger(n) || n < 1 || n > 5) return 'A rating has to be between 1 and 5 stars.'
  }
  return null
}

const cleanRating = (rating) =>
  rating === null || rating === undefined || rating === '' ? null : Number(rating)

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return

    /* ------------------------------------------------------------- read */
    if (req.method === 'GET') {
      const { itemId } = req.query || {}
      if (!itemId) return send(res, 400, { error: 'itemId is required' })

      // Reading is open, but knowing who is asking is what marks their own
      // rows as editable — so the session is read, not required.
      const session = await getSession(req)
      const viewerId = session?.user?.id || null
      const viewerIsAdmin = session?.user ? await isAdminUser(session.user) : false

      const rows = await sql`
        SELECT * FROM item_comments
        WHERE content_item_id = ${itemId}
        ORDER BY created_at DESC
        LIMIT 200
      `

      // Whether this is the viewer's own work is decided here, not by the
      // client: the public content projection deliberately carries no creator
      // email, so the browser has nothing to compare against.
      let isOwnWork = false
      if (session?.user?.email) {
        const owner = await sql`
          SELECT 1 FROM content_items ci
          JOIN creators c ON c.id = ci.creator_id
          WHERE ci.id = ${itemId} AND lower(c.email) = ${String(session.user.email).toLowerCase()}
          LIMIT 1
        `
        isOwnWork = owner.length > 0
      }
      const [summary] = await sql`
        SELECT COUNT(*) FILTER (WHERE rating IS NOT NULL)::int AS count,
               COALESCE(AVG(rating), 0)::float AS average
        FROM item_comments
        WHERE content_item_id = ${itemId}
      `

      return send(res, 200, {
        comments: rows.map((r) => shape(r, viewerId, viewerIsAdmin)),
        summary: {
          isOwnWork,
          ratingCount: summary.count,
          // One decimal is all a star average can honestly carry.
          average: Math.round(summary.average * 10) / 10,
          mine: viewerId ? rows.find((r) => r.user_id === viewerId && r.rating !== null)?.rating ?? null : null,
        },
      })
    }

    const user = await requireUser(req, res)
    if (!user) return

    /* ------------------------------------------------------------ write */
    if (req.method === 'POST') {
      if (!(await limit(req, res, { name: 'comment', key: user.id, ...LIMITS.write }))) return

      const { itemId, body, rating } = req.body || {}
      if (!itemId) return send(res, 400, { error: 'itemId is required' })

      const problem = validate({ body, rating })
      if (problem) return send(res, 400, { error: problem })

      // The item has to exist and be public before it can be discussed.
      const items = await sql`
        SELECT ci.id, c.email AS creator_email
        FROM content_items ci
        JOIN creators c ON c.id = ci.creator_id
        WHERE ci.id = ${itemId} AND ci.moderation_status = 'approved'
        LIMIT 1
      `
      if (items.length === 0) return send(res, 404, { error: 'not found' })

      const score = cleanRating(rating)

      // Rating your own work would be rating yourself. Commenting on it is
      // fine and expected — creators answer questions on their own pieces.
      if (score !== null && String(items[0].creator_email || '').toLowerCase() === String(user.email || '').toLowerCase()) {
        return send(res, 403, { error: 'You cannot rate your own work.' })
      }

      try {
        const [row] = await sql`
          INSERT INTO item_comments (content_item_id, user_id, author_name, author_image, body, rating)
          VALUES (${itemId}, ${user.id}, ${user.name || user.email}, ${user.image || null}, ${String(body).trim()}, ${score})
          RETURNING *
        `
        return send(res, 201, { comment: shape(row, user.id, false) })
      } catch (err) {
        // The partial unique index is what enforces one rating per person per
        // item; catching it here turns a constraint into a readable answer.
        if (err?.code === '23505') {
          return send(res, 409, { error: 'You have already reviewed this piece. Edit your review instead.' })
        }
        throw err
      }
    }

    /* ----------------------------------------------------------- update */
    if (req.method === 'PATCH') {
      const { id, body, rating } = req.body || {}
      if (!id) return send(res, 400, { error: 'id is required' })

      const problem = validate({ body, rating })
      if (problem) return send(res, 400, { error: problem })

      // Scoped to the author in the WHERE clause, so someone else's id simply
      // matches nothing rather than relying on a separate ownership read.
      const rows = await sql`
        UPDATE item_comments
        SET body = ${String(body).trim()}, rating = ${cleanRating(rating)}, edited_at = now()
        WHERE id = ${id} AND user_id = ${user.id}
        RETURNING *
      `
      if (rows.length === 0) return send(res, 404, { error: 'not found' })
      return send(res, 200, { comment: shape(rows[0], user.id, false) })
    }

    /* ----------------------------------------------------------- delete */
    const { id } = req.query || {}
    if (!id) return send(res, 400, { error: 'id is required' })

    // An admin can remove anything; everyone else only their own.
    const rows = (await isAdminUser(user))
      ? await sql`DELETE FROM item_comments WHERE id = ${id} RETURNING id`
      : await sql`DELETE FROM item_comments WHERE id = ${id} AND user_id = ${user.id} RETURNING id`

    if (rows.length === 0) return send(res, 404, { error: 'not found' })
    send(res, 200, { ok: true })
  })
}
