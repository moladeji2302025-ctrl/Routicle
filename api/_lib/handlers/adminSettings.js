import { sql } from '../db.js'
import { requireAdmin, logAdmin } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

/**
 * A handful of switches for the whole app, kept in one small table rather
 * than an environment variable, so flipping one doesn't need a redeploy.
 * Unset keys default to "on" / no message — see publicSettings.js.
 */
const KEYS = {
  maintenanceMessage: { type: 'string', max: 300 },
  signupsEnabled: { type: 'boolean' },
  aiImagesEnabled: { type: 'boolean' },
}

function clean(key, value) {
  const spec = KEYS[key]
  if (spec.type === 'boolean') return Boolean(value)
  return String(value ?? '').trim().slice(0, spec.max)
}

/**
 * GET    every switch, with its default filled in
 * PATCH  { key, value }   full admins only
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET', 'PATCH'])) return
    const admin = await requireAdmin(req, res)
    if (!admin) return

    if (req.method === 'GET') {
      const rows = await sql`SELECT key, value FROM app_settings WHERE key = ANY(${Object.keys(KEYS)})`
      const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]))
      return send(res, 200, {
        settings: {
          maintenanceMessage: stored.maintenanceMessage ?? '',
          signupsEnabled: stored.signupsEnabled ?? true,
          aiImagesEnabled: stored.aiImagesEnabled ?? true,
        },
      })
    }

    const { key, value } = req.body || {}
    if (!KEYS[key]) return send(res, 400, { error: `Unknown setting: ${key}` })
    const v = clean(key, value)
    await sql`
      INSERT INTO app_settings (key, value, updated_by) VALUES (${key}, ${JSON.stringify(v)}, ${admin.id})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
    `
    await logAdmin(admin, 'settings.set', key, { value: v })
    send(res, 200, { ok: true, key, value: v })
  })
}
