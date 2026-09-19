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
