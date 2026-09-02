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
