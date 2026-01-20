-- Create chore_assignments table for tracking assigned chores
-- REQ-5-002: Chore Assignments Table Migration

CREATE TABLE chore_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  recurrence_rule TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by chore
CREATE INDEX idx_chore_assignments_chore ON chore_assignments(chore_id);

-- Index for querying by assignee
CREATE INDEX idx_chore_assignments_assignee ON chore_assignments(assigned_to)
  WHERE assigned_to IS NOT NULL;

COMMENT ON TABLE chore_assignments IS 'Individual chore assignments with due dates and recurrence';
COMMENT ON COLUMN chore_assignments.assigned_to IS 'User assigned to this chore (null = unassigned/anyone)';
COMMENT ON COLUMN chore_assignments.due_date IS 'Date the chore is due';
COMMENT ON COLUMN chore_assignments.recurrence_rule IS 'RRULE format string for recurring chores';
COMMENT ON COLUMN chore_assignments.completed_at IS 'Timestamp when chore was marked complete (null = incomplete)';
