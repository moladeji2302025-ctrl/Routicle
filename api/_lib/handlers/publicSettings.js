import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

/**
 * The site-wide switches, for anyone. Small and cacheable: every page can
 * check this once without it ever being the slow part of a page load.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=120')

    const rows = await sql`SELECT key, value FROM app_settings WHERE key = ANY(${['maintenanceMessage', 'signupsEnabled', 'aiImagesEnabled']})`
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    send(res, 200, {
      maintenanceMessage: stored.maintenanceMessage || '',
      signupsEnabled: stored.signupsEnabled ?? true,
      aiImagesEnabled: stored.aiImagesEnabled ?? true,
    })
  })
}
