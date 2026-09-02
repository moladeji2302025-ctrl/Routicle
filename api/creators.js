import { sql } from './_lib/db.js'
import { send, methodGuard, withErrorHandling } from './_lib/http.js'

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (req.method === 'GET') {
      const email = (req.query.email || '').toLowerCase().trim()
      if (!email) return send(res, 400, { error: 'email query param is required' })
      const rows = await sql`SELECT * FROM creators WHERE email = ${email}`
      if (rows.length === 0) return send(res, 404, { error: 'not found' })
      return send(res, 200, rows[0])
    }

    if (!methodGuard(req, res, ['POST'])) return

    const { name, email, bio, specialty, location, social } = req.body || {}
    if (!name || !email) return send(res, 400, { error: 'name and email are required' })
    const normalizedEmail = email.toLowerCase().trim()

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
