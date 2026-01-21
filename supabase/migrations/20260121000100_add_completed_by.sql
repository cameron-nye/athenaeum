-- Add completed_by column to track who actually completed the chore
-- This is separate from assigned_to (who was supposed to do it)

ALTER TABLE chore_assignments ADD COLUMN completed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index for querying by completer
CREATE INDEX idx_chore_assignments_completed_by ON chore_assignments(completed_by)
  WHERE completed_by IS NOT NULL;

COMMENT ON COLUMN chore_assignments.completed_by IS 'User who actually completed the chore (may differ from assigned_to)';
