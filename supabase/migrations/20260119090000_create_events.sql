-- Create events table for cached calendar events
-- REQ-2-004: Events Table Migration

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_source_id UUID NOT NULL REFERENCES calendar_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (calendar_source_id, external_id)
);

COMMENT ON TABLE events IS 'Cached calendar events synced from external providers';
COMMENT ON COLUMN events.external_id IS 'Event ID from the calendar provider';
COMMENT ON COLUMN events.all_day IS 'Whether this is an all-day event';
COMMENT ON COLUMN events.recurrence_rule IS 'RRULE string for recurring events';
COMMENT ON COLUMN events.raw_data IS 'Full event data from provider for debugging';
