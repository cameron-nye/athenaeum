-- Create photo_sources table for storing connected Google Photos albums
-- REQ-4-026: Create photos_sources table for Google Photos

CREATE TABLE photo_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  album_id TEXT NOT NULL,
  album_name TEXT NOT NULL,
  album_cover_url TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  photo_count INTEGER DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (household_id, provider, album_id)
);

-- Index for querying by household
CREATE INDEX idx_photo_sources_household ON photo_sources(household_id);

-- Index for finding sources that need sync
CREATE INDEX idx_photo_sources_sync ON photo_sources(enabled, last_synced_at)
  WHERE enabled = true;

COMMENT ON TABLE photo_sources IS 'Connected Google Photos albums for each household';
COMMENT ON COLUMN photo_sources.provider IS 'Photo provider: google';
COMMENT ON COLUMN photo_sources.album_id IS 'Album ID from Google Photos';
COMMENT ON COLUMN photo_sources.album_name IS 'Display name of the album';
COMMENT ON COLUMN photo_sources.album_cover_url IS 'URL of album cover image';
COMMENT ON COLUMN photo_sources.access_token_encrypted IS 'Encrypted OAuth access token';
COMMENT ON COLUMN photo_sources.refresh_token_encrypted IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN photo_sources.sync_token IS 'Provider sync token for incremental sync';
COMMENT ON COLUMN photo_sources.photo_count IS 'Number of photos synced from this album';
