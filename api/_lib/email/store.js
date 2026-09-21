import { sql } from '../db.js'

/**
 * Everything the email system remembers.
 *
 *   email_log            one row per message: who, what, and how it went
 *   email_suppressions   addresses we must not send to again
 *   email_preferences    per-account choices about optional email
 *   newsletter_broadcasts / newsletter_deliveries   the newsletter sender
 *
 * The tables are created on first use (CREATE TABLE IF NOT EXISTS), the same
 * way newsletter_subscribers is, so a fresh database or a preview branch works
 * without a migration step. db/schema.sql documents them.
 *
 * Privacy: the log holds an address and a subject line, never a message body,
 * and a link or code inside an email is never written here.
 */

let ensured = false

export async function ensureEmailTables() {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS email_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      to_email text NOT NULL,
      category text NOT NULL,
      template text,
      subject text,
      status text NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued','sent','delivered','delayed','bounced','complained','failed','suppressed','skipped')),
      provider_id text,
      error text,
      dedupe_key text,
      user_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS email_log_dedupe_idx ON email_log (dedupe_key) WHERE dedupe_key IS NOT NULL`
  await sql`CREATE INDEX IF NOT EXISTS email_log_created_idx ON email_log (created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS email_log_provider_idx ON email_log (provider_id) WHERE provider_id IS NOT NULL`
  await sql`
    CREATE TABLE IF NOT EXISTS email_suppressions (
      email text PRIMARY KEY,
      reason text NOT NULL CHECK (reason IN ('bounce','complaint','manual')),
      detail text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS email_preferences (
      user_id text PRIMARY KEY,
      prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_broadcasts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject text NOT NULL,
      preheader text,
      body text NOT NULL,
      status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','sent')),
      total integer NOT NULL DEFAULT 0,
      sent integer NOT NULL DEFAULT 0,
      failed integer NOT NULL DEFAULT 0,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_deliveries (
      broadcast_id uuid NOT NULL REFERENCES newsletter_broadcasts(id) ON DELETE CASCADE,
      email text NOT NULL,
      status text NOT NULL DEFAULT 'queued',
      provider_id text,
      error text,
      PRIMARY KEY (broadcast_id, email)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS newsletter_deliveries_provider_idx ON newsletter_deliveries (provider_id) WHERE provider_id IS NOT NULL`
  ensured = true
}

/* ----------------------------------------------------------- preferences */

/**
 * The categories an account can switch off, with their defaults. This mirrors
 * `notifications` in src/data/settings.js, which is what the Settings page
 * shows; a category missing from here would show a toggle that did nothing.
 */
export const PREF_DEFAULTS = {
  followedCreators: true,
  teamActivity: true,
  moderationResults: true,
  clientResponses: true,
  payouts: true,
  productUpdates: true,
  marketing: false,
}

export async function getPreferences(userId) {
  if (!userId) return { ...PREF_DEFAULTS }
  await ensureEmailTables()
  const rows = await sql`SELECT prefs FROM email_preferences WHERE user_id = ${userId}`
  return { ...PREF_DEFAULTS, ...(rows[0]?.prefs || {}) }
}

export async function savePreferences(userId, patch) {
  await ensureEmailTables()
  // Only known keys, only booleans: this is written straight from a request body.
  const clean = {}
  for (const key of Object.keys(PREF_DEFAULTS)) {
    if (typeof patch?.[key] === 'boolean') clean[key] = patch[key]
  }
  await sql`
    INSERT INTO email_preferences (user_id, prefs, updated_at)
    VALUES (${userId}, ${JSON.stringify(clean)}::jsonb, now())
    ON CONFLICT (user_id) DO UPDATE SET prefs = email_preferences.prefs || EXCLUDED.prefs, updated_at = now()
  `
  return getPreferences(userId)
}

/* ---------------------------------------------------------- suppressions */

export const normalizeEmail = (e) => String(e || '').trim().toLowerCase()

export async function isSuppressed(email) {
  await ensureEmailTables()
  const rows = await sql`SELECT reason FROM email_suppressions WHERE email = ${normalizeEmail(email)}`
  return rows[0]?.reason || null
}

export async function suppress(email, reason, detail) {
  await ensureEmailTables()
  await sql`
    INSERT INTO email_suppressions (email, reason, detail)
    VALUES (${normalizeEmail(email)}, ${reason}, ${detail ? String(detail).slice(0, 300) : null})
    ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason, detail = EXCLUDED.detail
  `
}

export async function unsuppress(email) {
  await ensureEmailTables()
  await sql`DELETE FROM email_suppressions WHERE email = ${normalizeEmail(email)}`
}

/* ------------------------------------------------------------------- log */

/**
 * Records that a message is about to be sent. When `dedupeKey` is given and a
 * message with that key was already recorded, returns null: the caller must
 * not send it again. That is what stops a webhook retry, a double click or a
 * refreshed callback page from mailing the same receipt twice.
 */
export async function beginLog({ to, category, template, subject, dedupeKey, userId }) {
  await ensureEmailTables()
  const rows = await sql`
    INSERT INTO email_log (to_email, category, template, subject, dedupe_key, user_id)
    VALUES (${normalizeEmail(to)}, ${category}, ${template || null}, ${String(subject || '').slice(0, 200)}, ${dedupeKey || null}, ${userId || null})
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
    RETURNING id
  `
  return rows[0]?.id || null
}

export async function finishLog(id, { status, providerId, error }) {
  if (!id) return
  await sql`
    UPDATE email_log
    SET status = ${status}, provider_id = ${providerId || null}, error = ${error ? String(error).slice(0, 400) : null}, updated_at = now()
    WHERE id = ${id}
  `
}

/** Something happened to a message after it left (delivered, bounced…). */
export async function updateByProviderId(providerId, status, error) {
  if (!providerId) return
  await ensureEmailTables()
  // Never step backwards: a late "delivered" must not overwrite "complained".
  await sql`
    UPDATE email_log SET status = ${status}, error = COALESCE(${error || null}, error), updated_at = now()
    WHERE provider_id = ${providerId}
      AND NOT (status IN ('bounced','complained') AND ${status} IN ('sent','delivered','delayed'))
  `
}
