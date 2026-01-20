-- Create chores table for household chore definitions
-- REQ-5-001: Chores Table Migration

CREATE TABLE chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by household
CREATE INDEX idx_chores_household ON chores(household_id);

COMMENT ON TABLE chores IS 'Chore definitions for each household';
COMMENT ON COLUMN chores.title IS 'Name of the chore';
COMMENT ON COLUMN chores.description IS 'Optional longer description of the chore';
COMMENT ON COLUMN chores.icon IS 'Emoji or icon identifier for the chore';
COMMENT ON COLUMN chores.points IS 'Points awarded for completing this chore';
