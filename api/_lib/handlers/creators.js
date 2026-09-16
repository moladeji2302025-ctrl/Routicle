import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { requireUser, isAdminUser } from '../auth.js'

/** Public view of a creator: no email, no storage accounting, no internals. */
function publicShape(row) {
  return {
    id: row.id,
    name: row.name,
    bio: row.bio,
    specialty: row.specialty,
    location: row.location,
    social: row.social,
    created_at: row.created_at,
  }
}

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (req.method === 'GET') {
      const email = (req.query.email || '').toLowerCase().trim()
      if (!email) return send(res, 400, { error: 'email query param is required' })

      // Looking a creator up by email is an authenticated action, and the full
      // row — email, storage bytes, payout details — goes only to that creator
      // or to an admin. `SELECT *` to anyone was an enumeration endpoint.
      const user = await requireUser(req, res)
      if (!user) return

      const rows = await sql`SELECT * FROM creators WHERE lower(email) = ${email}`
      if (rows.length === 0) return send(res, 404, { error: 'not found' })

      const isSelf = String(user.email || '').toLowerCase() === email
      const full = isSelf || (await isAdminUser(user))
      return send(res, 200, full ? rows[0] : publicShape(rows[0]))
    }

    if (!methodGuard(req, res, ['POST'])) return

    // A creator record is always created for the session's own email, so an
    // application cannot be filed in someone else's name.
    const user = await requireUser(req, res)
    if (!user) return

    const { name, bio, specialty, location, social } = req.body || {}
    if (!name) return send(res, 400, { error: 'name is required' })
    const normalizedEmail = String(user.email || '').toLowerCase().trim()
    if (!normalizedEmail) return send(res, 400, { error: 'Your account has no email address' })

    const rows = await sql`
      INSERT INTO creators (name, email, bio, specialty, location, social)
      VALUES (${name}, ${normalizedEmail}, ${bio || null}, ${specialty || null}, ${location || null}, ${JSON.stringify(social || {})})
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        bio = COALESCE(EXCLUDED.bio, creators.bio),
        specialty = COALESCE(EXCLUDED.specialty, creators.specialty),
        location = COALESCE(EXCLUDED.location, creators.location),
        social = COALESCE(EXCLUDED.social, creators.social)
      RETURNING *
    `
    send(res, 200, rows[0])
  })
}
