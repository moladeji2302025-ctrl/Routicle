-- Routicle backend schema (Neon Postgres).
-- Applied directly via the Neon MCP tools; kept here for reference and future migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  bio TEXT,
  specialty TEXT,
  location TEXT,
  social JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  sub_department TEXT,
  file_types TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  behind_the_design TEXT,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  is_free BOOLEAN NOT NULL DEFAULT false,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  moderation_note TEXT,
  thumbnail_key TEXT,        -- object key in the public routicle-previews bucket
  preview_video_key TEXT,    -- object key in the public routicle-previews bucket (Express/video formats)
  source_object_keys JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ "label": "PSD", "key": "source/<creatorId>/<uuid>-file.psd" }] in the private routicle-sources bucket
  appreciation_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moderated_at TIMESTAMPTZ
);

CREATE INDEX idx_content_items_creator ON content_items(creator_id);
CREATE INDEX idx_content_items_status ON content_items(moderation_status);
CREATE INDEX idx_content_items_department ON content_items(department);

CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_downloads_item ON downloads(content_item_id);
CREATE INDEX idx_downloads_user ON downloads(user_email);

-- ---------------------------------------------------------------------------
-- Comments and reviews on a piece of work.
--
-- One table, not two: a review is a comment that carries a rating, so keeping
-- them apart would mean two queries, two sort orders and two ways to moderate
-- the same thing. `rating` is nullable — null is a plain comment.
--
-- user_id references neon_auth."user", which Neon Auth owns, so there is no
-- foreign key to it: this schema must not assume write access to that schema,
-- and a deleted account should leave its comments readable rather than
-- cascading them away mid-thread. Author name and image are denormalised for
-- the same reason — the comment still renders after the profile is gone.
CREATE TABLE IF NOT EXISTS item_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_image TEXT,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  rating SMALLINT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The feed query is always "this item, newest first".
CREATE INDEX IF NOT EXISTS item_comments_item_idx
  ON item_comments (content_item_id, created_at DESC);

-- At most one rating per person per item, so the average cannot be stuffed by
-- one account posting twenty five-star reviews. Plain comments are unlimited,
-- which is why the index is partial rather than a table-wide unique constraint.
CREATE UNIQUE INDEX IF NOT EXISTS item_comments_one_rating_per_user
  ON item_comments (content_item_id, user_id)
  WHERE rating IS NOT NULL;

-- ---------------------------------------------------------------------------
-- One-time email codes for actions that cannot be undone (account deletion).
-- Only an HMAC of the code is stored, keyed with a server secret, so a leaked
-- row cannot be checked against the million possible six-digit codes offline.
-- One live code per user per purpose: requesting another replaces it.
CREATE TABLE IF NOT EXISTS verification_codes (
  user_id text NOT NULL,
  purpose text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, purpose)
);

-- ---------------------------------------------------------------------------
-- Per-account failed sign-in count (see api/_lib/loginGuard.js). Keyed by
-- email, including addresses with no account, so the response can't reveal
-- which addresses exist. The lock itself is enforced by Neon Auth through
-- neon_auth."user".banned / "banExpires"; this table only counts.
CREATE TABLE IF NOT EXISTS login_attempts (
  email text PRIMARY KEY,
  failures integer NOT NULL DEFAULT 0,
  last_failed_at timestamptz,
  locked_until timestamptz
);

-- A display-only WebP copy of the thumbnail, made in the uploader's browser.
-- The gated download is always the original source file.
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS thumbnail_webp_key text;

-- ---------------------------------------------------------------------------
-- Newsletter signups from logged-out visitors (see handlers/newsletter.js).
-- Double opt-in: a row stays 'pending' until the confirmation link is used.
-- Only a SHA-256 of the confirmation token is stored. The unsubscribe token is
-- kept as is because every future newsletter has to carry it.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  source text,
  confirm_token_hash text,
  confirm_expires_at timestamptz,
  unsubscribe_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Email system (see api/_lib/email/ and docs/EMAIL.md). All of these are also
-- created on first use by ensureEmailTables(), so a fresh database needs no
-- migration step.

-- One row per message. Holds an address and a subject line, never a body, a
-- link or a code. `dedupe_key` is what stops a retried webhook or a refreshed
-- page from sending the same receipt twice.
CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  category text NOT NULL,                  -- transactional | notification | marketing
  template text,
  subject text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','delivered','delayed','bounced','complained','failed','suppressed','skipped')),
  provider_id text,                        -- Resend's id, used to match webhook events
  error text,
  dedupe_key text,
  user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS email_log_dedupe_idx ON email_log (dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_log_created_idx ON email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS email_log_provider_idx ON email_log (provider_id) WHERE provider_id IS NOT NULL;

-- Addresses that must not be mailed: a permanent bounce, a spam report, or a
-- manual block. Sending to these damages the sending domain's reputation.
CREATE TABLE IF NOT EXISTS email_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL CHECK (reason IN ('bounce','complaint','manual')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Which optional email an account wants. Kept here rather than in the browser
-- because this is where the sending code can read it.
CREATE TABLE IF NOT EXISTS email_preferences (
  user_id text PRIMARY KEY,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
);

-- A recipient is recorded here before they are sent to, which is what makes a
-- half-finished broadcast resumable and impossible to send twice.
CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  broadcast_id uuid NOT NULL REFERENCES newsletter_broadcasts(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_id text,
  error text,
  PRIMARY KEY (broadcast_id, email)
);

-- ---------------------------------------------------------------------------
-- Staff roles and the admin activity log.
-- role: admin | marketing | sales | support | moderator. Admin can do
-- everything; the others open only their own department's console pages.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS platform_admins ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log (created_at DESC);

-- Accounts that have finished the welcome flow. Server-side so a new device
-- doesn't send an existing account through it again.
CREATE TABLE IF NOT EXISTS onboarding_done (
  user_id uuid PRIMARY KEY,
  completed_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- The Routicle blog. status: draft | published. The public read only ever
-- returns published rows; drafts stay behind the admin API.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  cover_url text,
  author_name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_posts_pub_idx ON blog_posts (published_at DESC) WHERE status = 'published';

-- ---------------------------------------------------------------------------
-- Customer care: the Contact form's submissions as tickets, with the reply
-- thread. category is free-form on the client but constrained here; complaints
-- and billing issues are just categories on the same table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'complaint', 'billing', 'creator', 'press')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  assignee_email text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status, created_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  body text NOT NULL,
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON support_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Sales leads: a prospect list, deliberately separate from account emails.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  company text,
  source text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'replied', 'won', 'lost')),
  notes text,
  unsubscribe_token text NOT NULL,
  unsubscribed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_messages_lead_idx ON lead_messages (lead_id, sent_at);

-- App-wide switches (maintenance banner, sign-ups on/off, AI images on/off).
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Plan grants (subscriptions.provider = 'admin-grant') and account suspension
-- reuse existing columns: subscriptions.provider, and Better Auth's own
-- neon_auth."user".banned / "banReason" / "banExpires". No new columns needed.

-- Admin-curated background photos for Mockup Studio (Creative Suite) — every
-- user warps their own logo onto these, so the image itself is the only
-- per-template asset; image_key is an object key in the public
-- routicle-previews bucket (routicle-previews CORS is public-GET so the
-- client can draw it onto a canvas without tainting it).
CREATE TABLE IF NOT EXISTS mockup_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  image_key text NOT NULL,
  width integer,
  height integer,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mockup_templates_category ON mockup_templates (category, sort_order);
