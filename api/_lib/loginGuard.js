/**
 * Per-account brute-force protection for password sign-in.
 *
 * Neon Auth already rate-limits sign-in per IP (the 8th failure inside its
 * window gets 429, and it ignores X-Forwarded-For, so that can't be spoofed).
 * Per-IP limits alone fall to anyone rotating addresses, which is why this
 * counts failures per *account*.
 *
 * Where each part happens, and why:
 *
 *  · The password is checked here, against the scrypt hash Neon Auth stores,
 *    before the browser signs in. It is not done by calling Neon Auth from the
 *    server: every such call would reach Neon from Vercel's shared egress IPs,
 *    so its per-IP limit would start refusing genuine users platform-wide at
 *    roughly eight sign-ins per ten seconds. On a pass the browser signs in
 *    with Neon directly, from its own address, exactly as before.
 *
 *  · The lock is enforced by Neon Auth itself. After five consecutive failures
 *    the account is banned until the lock expires, using the admin plugin's
 *    `banned` / `banExpires` columns. Neon refuses a banned account even with
 *    the correct password, and lifts the ban on its own at `banExpires` — so the
 *    lock holds against someone who skips this check and calls Neon's endpoint
 *    directly.
 *
 * The known gap: failures made directly against Neon Auth's public sign-in
 * endpoint, bypassing Routicle, are not counted here — only Neon's per-IP limit
 * applies to them. Closing that needs the lockout inside the auth provider.
 */

import crypto from 'crypto'
import { sql } from './db.js'

export const MAX_FAILURES = 5
export const LOCK_MINUTES = 30
export const LOCK_REASON = 'Temporarily locked after too many failed sign-in attempts.'

let ensured = false

async function ensureTable() {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      email text PRIMARY KEY,
      failures integer NOT NULL DEFAULT 0,
      last_failed_at timestamptz,
      locked_until timestamptz
    )
  `
  ensured = true
}

// Better Auth's parameters: scrypt over the NFKC-normalised password, using the
// salt's hex *string* as the salt, N=16384 r=16 p=1, 64-byte key.
const SCRYPT = { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 }

function derive(password, salt) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(String(password).normalize('NFKC'), salt, 64, SCRYPT, (err, key) => (err ? reject(err) : resolve(key)))
  )
}

// Hashed for accounts that don't exist, so a missing account takes as long to
// refuse as a wrong password and response time can't reveal which it was.
const DUMMY_SALT = crypto.randomBytes(16).toString('hex')

async function verifyAgainst(stored, password) {
  const [salt, key] = String(stored || '').split(':')
  if (!salt || !key) {
    await derive(password, DUMMY_SALT)
    return false
  }
  const expected = Buffer.from(key, 'hex')
  const actual = await derive(password, salt)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Checks a sign-in attempt. Resolves to one of:
 *   { status: 'ok' }
 *   { status: 'wrong', remaining }
 *   { status: 'locked', until, justLocked, userId, email }
 */
export async function checkSignIn(rawEmail, password) {
  await ensureTable()
  const email = String(rawEmail || '').trim().toLowerCase()

  const [row] = await sql`SELECT failures, locked_until FROM login_attempts WHERE email = ${email}`
  if (row?.locked_until && new Date(row.locked_until) > new Date()) {
    return { status: 'locked', until: row.locked_until, justLocked: false }
  }

  // An increasing delay on every failure so far: 0s, 0.8s, 1.6s, 2.4s, 3.2s.
  // Paid by the caller before the password is even looked at.
  const failuresSoFar = row?.failures || 0
  if (failuresSoFar > 0) await sleep(Math.min(failuresSoFar * 800, 4000))

  const [account] = await sql`
    SELECT u.id, a.password
    FROM neon_auth."user" u
    JOIN neon_auth.account a ON a."userId" = u.id AND a."providerId" = 'credential'
    WHERE lower(u.email) = ${email}
    LIMIT 1
  `
  const ok = await verifyAgainst(account?.password, password)

  if (ok) {
    // A successful sign-in resets the count.
    await sql`DELETE FROM login_attempts WHERE email = ${email}`
    return { status: 'ok' }
  }

  // Counted per email, whether or not the account exists, so the response
  // can't be used to find out which addresses have accounts.
  const [counted] = await sql`
    INSERT INTO login_attempts (email, failures, last_failed_at)
    VALUES (${email}, 1, now())
    ON CONFLICT (email) DO UPDATE SET
      failures = CASE
        WHEN login_attempts.locked_until IS NOT NULL AND login_attempts.locked_until <= now() THEN 1
        ELSE login_attempts.failures + 1
      END,
      locked_until = CASE
        WHEN login_attempts.locked_until IS NOT NULL AND login_attempts.locked_until <= now() THEN NULL
        ELSE login_attempts.locked_until
      END,
      last_failed_at = now()
    RETURNING failures
  `

  if (counted.failures < MAX_FAILURES) {
    return { status: 'wrong', remaining: MAX_FAILURES - counted.failures }
  }

  const [locked] = await sql`
    UPDATE login_attempts
    SET locked_until = now() + make_interval(mins => ${LOCK_MINUTES}), failures = 0
    WHERE email = ${email}
    RETURNING locked_until
  `

  if (account?.id) {
    // Enforced by Neon Auth from here on. An existing ban set by an admin for
    // some other reason is never overwritten or shortened.
    await sql`
      UPDATE neon_auth."user"
      SET banned = true, "banReason" = ${LOCK_REASON}, "banExpires" = ${locked.locked_until}
      WHERE id = ${account.id} AND (banned IS NOT TRUE OR "banReason" = ${LOCK_REASON})
    `
  }

  return {
    status: 'locked',
    until: locked.locked_until,
    justLocked: true,
    userId: account?.id || null,
    email,
  }
}
