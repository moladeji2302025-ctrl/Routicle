/**
 * Fixed-window rate limiting, kept in Postgres.
 *
 * Deliberately not in-memory: every /api/* route is a serverless function, so
 * an in-process counter is per-instance and resets on every cold start. A
 * limiter that an attacker can reset by opening more connections is not a
 * limiter. The database is the one piece of state all instances share.
 *
 * The whole window is one statement, so two requests racing cannot both read
 * the same count and both decide they are under the limit.
 */

import { sql } from './db.js'
import { send } from './http.js'

let ensured = false

async function ensureTable() {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket text PRIMARY KEY,
      window_start timestamptz NOT NULL DEFAULT now(),
      hits integer NOT NULL DEFAULT 0
    )
  `
  ensured = true
}

/**
 * The caller's address, for limiting things that happen before there is a
 * session to key on.
 *
 * Only the leftmost x-forwarded-for entry is used, and only because Vercel
 * rewrites that header at the edge — behind a proxy that appends instead of
 * replacing, a client could prepend a forged address and rotate it freely.
 */
export function clientIp(req) {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim()
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown'
}

/**
 * Counts one hit against `key`. Resolves true when the caller is within the
 * limit, false when they are over it.
 *
 * Fails open on a database error: a limiter that 500s would take the whole
 * endpoint down with it, which is a worse outcome than a missed count. The
 * authorization checks are what actually protect the data.
 */
export async function hit(key, { limit, windowSeconds }) {
  try {
    await ensureTable()
    const rows = await sql`
      INSERT INTO rate_limits (bucket, window_start, hits)
      VALUES (${key}, now(), 1)
      ON CONFLICT (bucket) DO UPDATE SET
        hits = CASE
          WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN 1
          ELSE rate_limits.hits + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN now()
          ELSE rate_limits.window_start
        END
      RETURNING hits, window_start
    `
    const { hits } = rows[0]
    return { ok: hits <= limit, hits, retryAfter: windowSeconds }
  } catch (err) {
    console.error('rate limit check failed, allowing request:', err.message)
    return { ok: true, hits: 0, retryAfter: 0 }
  }
}

/**
 * Applies a limit and sends 429 when it is exceeded.
 * Resolves true when the caller may proceed.
 */
export async function limit(req, res, { name, limit: max, windowSeconds, key }) {
  const bucket = `${name}:${key || clientIp(req)}`
  const result = await hit(bucket, { limit: max, windowSeconds })
  if (!result.ok) {
    res.setHeader('Retry-After', String(result.retryAfter))
    send(res, 429, { error: 'Too many requests. Try again shortly.' })
    return false
  }
  return true
}

/** Presets, so limits are consistent and named rather than sprinkled inline. */
export const LIMITS = {
  // Anything that sends mail or mutates credentials: tight, and keyed per user.
  sensitive: { limit: 5, windowSeconds: 900 },
  // Issuing presigned URLs — both upload and download.
  presign: { limit: 60, windowSeconds: 300 },
  // Ordinary authenticated writes.
  write: { limit: 120, windowSeconds: 60 },
  // Unauthenticated reads.
  read: { limit: 300, windowSeconds: 60 },
}
