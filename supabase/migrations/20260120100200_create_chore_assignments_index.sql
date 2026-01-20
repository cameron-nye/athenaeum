-- Create performance index for chore assignment queries
-- REQ-5-003: Chore Assignments Index

-- Composite index for finding upcoming and overdue chores
-- Queries: WHERE due_date <= X AND completed_at IS NULL
CREATE INDEX idx_chore_assignments_due ON chore_assignments(due_date, completed_at);
