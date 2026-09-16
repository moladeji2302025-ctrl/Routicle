/**
 * Short-lived, single-use email codes for actions that cannot be undone.
 *
 * Holding a session is enough to use an account, but it should not be enough
 * to erase one: a borrowed laptop or a stolen token would otherwise delete
 * everything in one request. A code sent to the account's own address means the
 * person asking also controls the mailbox.
 *
 * Only a keyed hash of the code is stored. Six digits is a small space, so a
 * plain hash in a leaked table could be reversed in seconds; with a server-side
 * key it cannot be checked offline at all. Codes expire after ten minutes, allow
 * five attempts, and are deleted the moment they are used.
 */

import crypto from 'crypto'
import { sql } from './db.js'

const TTL_MINUTES = 10
export const MAX_ATTEMPTS = 5

let ensured = false

async function ensureTable() {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS verification_codes (
      user_id text NOT NULL,
      purpose text NOT NULL,
      code_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      attempts integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, purpose)
    )
  `
  ensured = true
}

/**
 * CODE_SECRET is preferred. DATABASE_URL is the fallback because it is already
 * a server-only secret on every deployment, so the hash is keyed even before a
 * dedicated secret is configured.
 */
function key() {
  return process.env.CODE_SECRET || process.env.DATABASE_URL || ''
}

function hashCode(userId, purpose, code) {
  return crypto.createHmac('sha256', key()).update(`${purpose}:${userId}:${code}`).digest('hex')
}

/** Issues a new code, replacing any earlier one for the same purpose. */
export async function issueCode(userId, purpose) {
  await ensureTable()
  // randomInt is uniform; Math.random is neither uniform nor unpredictable.
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  await sql`
    INSERT INTO verification_codes (user_id, purpose, code_hash, expires_at, attempts)
    VALUES (${userId}, ${purpose}, ${hashCode(userId, purpose, code)},
            now() + make_interval(mins => ${TTL_MINUTES}), 0)
    ON CONFLICT (user_id, purpose) DO UPDATE SET
      code_hash = EXCLUDED.code_hash,
      expires_at = EXCLUDED.expires_at,
      attempts = 0,
      created_at = now()
  `
  return { code, minutes: TTL_MINUTES }
}

/**
 * Checks a submitted code. Resolves to { ok: true } exactly once per issued code.
 * Otherwise { ok: false, reason } where reason is 'missing', 'expired',
 * 'locked' or 'wrong'.
 */
export async function consumeCode(userId, purpose, submitted) {
  await ensureTable()
  const digits = String(submitted || '').replace(/\D/g, '')

  const rows = await sql`
    SELECT code_hash, expires_at, attempts FROM verification_codes
    WHERE user_id = ${userId} AND purpose = ${purpose}
    LIMIT 1
  `
  if (rows.length === 0) return { ok: false, reason: 'missing' }
  const row = rows[0]

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await sql`DELETE FROM verification_codes WHERE user_id = ${userId} AND purpose = ${purpose}`
    return { ok: false, reason: 'expired' }
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await sql`DELETE FROM verification_codes WHERE user_id = ${userId} AND purpose = ${purpose}`
    return { ok: false, reason: 'locked' }
  }

  const expected = Buffer.from(row.code_hash, 'hex')
  const actual = Buffer.from(hashCode(userId, purpose, digits), 'hex')
  // Constant time, so response timing says nothing about how close a guess was.
  const match = digits.length === 6 && expected.length === actual.length && crypto.timingSafeEqual(expected, actual)

  if (!match) {
    const [updated] = await sql`
      UPDATE verification_codes SET attempts = attempts + 1
      WHERE user_id = ${userId} AND purpose = ${purpose}
      RETURNING attempts
    `
    return { ok: false, reason: 'wrong', remaining: Math.max(0, MAX_ATTEMPTS - (updated?.attempts ?? MAX_ATTEMPTS)) }
  }

  // Single use: gone before the caller does anything with it.
  await sql`DELETE FROM verification_codes WHERE user_id = ${userId} AND purpose = ${purpose}`
  return { ok: true }
}

/** m*****i@gmail.com: enough to recognise the address, not enough to harvest it. */
export function maskEmail(email) {
  const [local = '', domain = ''] = String(email || '').split('@')
  if (!domain) return 'your email address'
  const shown = local.length <= 2 ? local[0] || '' : `${local[0]}${'*'.repeat(Math.min(6, local.length - 2))}${local.at(-1)}`
  return `${shown}@${domain}`
}
