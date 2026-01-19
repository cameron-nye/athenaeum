-- Create calendar_sources table for storing connected calendar accounts
-- REQ-2-003: Calendar Sources Table Migration

CREATE TABLE calendar_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'ical')),
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (household_id, provider, external_id)
);

-- Index for querying by household
CREATE INDEX idx_calendar_sources_household ON calendar_sources(household_id);

-- Index for finding calendars that need sync
CREATE INDEX idx_calendar_sources_sync ON calendar_sources(enabled, last_synced_at)
  WHERE enabled = true;

COMMENT ON TABLE calendar_sources IS 'Connected calendar accounts (Google, iCal) for each household';
COMMENT ON COLUMN calendar_sources.provider IS 'Calendar provider: google or ical';
COMMENT ON COLUMN calendar_sources.external_id IS 'Calendar ID from the provider';
COMMENT ON COLUMN calendar_sources.access_token_encrypted IS 'Encrypted OAuth access token';
COMMENT ON COLUMN calendar_sources.refresh_token_encrypted IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN calendar_sources.sync_token IS 'Provider sync token for incremental sync';
