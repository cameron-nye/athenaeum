-- Create photos table for storing photo metadata
-- Phase 4: Photos feature
-- REQ-4-001

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  taken_at TIMESTAMPTZ,
  album TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for household lookup
CREATE INDEX idx_photos_household ON photos(household_id);

-- Index for album filtering
CREATE INDEX idx_photos_album ON photos(household_id, album) WHERE album IS NOT NULL;

-- Index for enabled photos (slideshow queries)
CREATE INDEX idx_photos_enabled ON photos(household_id, enabled, created_at) WHERE enabled = true;

-- Trigger to update updated_at on modification
CREATE OR REPLACE FUNCTION update_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION update_photos_updated_at();

COMMENT ON TABLE photos IS 'Photo metadata for household photo slideshow';
COMMENT ON COLUMN photos.storage_path IS 'Path in Supabase Storage: photos/{household_id}/{filename}';
COMMENT ON COLUMN photos.taken_at IS 'Date photo was taken (from EXIF if available)';
COMMENT ON COLUMN photos.album IS 'Optional album name for organization';
COMMENT ON COLUMN photos.enabled IS 'Whether photo appears in slideshow';
