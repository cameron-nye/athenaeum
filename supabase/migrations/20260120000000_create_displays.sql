-- Create displays table for Raspberry Pi wall display devices
-- Phase 3: Display Route

CREATE TABLE displays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  auth_token TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for household lookup
CREATE INDEX idx_displays_household ON displays(household_id);

-- Index for token-based authentication
CREATE INDEX idx_displays_auth_token ON displays(auth_token);

-- Trigger to update updated_at on modification
CREATE OR REPLACE FUNCTION update_displays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER displays_updated_at
  BEFORE UPDATE ON displays
  FOR EACH ROW
  EXECUTE FUNCTION update_displays_updated_at();

COMMENT ON TABLE displays IS 'Registered display devices (Raspberry Pi) for each household';
COMMENT ON COLUMN displays.auth_token IS 'Unique token for display authentication (stored in cookie)';
COMMENT ON COLUMN displays.settings IS 'Display settings (theme, layout, widgets, refreshInterval)';
COMMENT ON COLUMN displays.last_seen_at IS 'Last heartbeat timestamp from display';
