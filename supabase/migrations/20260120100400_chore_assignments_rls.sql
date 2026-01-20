-- Enable Row Level Security on chore_assignments table
-- REQ-5-005: RLS policies for chore assignments
-- Policies join through chores to check household membership

ALTER TABLE chore_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view assignments for their own household's chores
CREATE POLICY "Users can view own household chore assignments"
  ON chore_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chores c
      WHERE c.id = chore_assignments.chore_id
        AND c.household_id = get_user_household_id()
    )
  );

-- INSERT: Users can create assignments for their own household's chores
CREATE POLICY "Users can add chore assignments to own household"
  ON chore_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chores c
      WHERE c.id = chore_assignments.chore_id
        AND c.household_id = get_user_household_id()
    )
  );

-- UPDATE: Users can update their own household's assignments
CREATE POLICY "Users can update own household chore assignments"
  ON chore_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chores c
      WHERE c.id = chore_assignments.chore_id
        AND c.household_id = get_user_household_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chores c
      WHERE c.id = chore_assignments.chore_id
        AND c.household_id = get_user_household_id()
    )
  );

-- DELETE: Users can delete their own household's assignments
CREATE POLICY "Users can delete own household chore assignments"
  ON chore_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chores c
      WHERE c.id = chore_assignments.chore_id
        AND c.household_id = get_user_household_id()
    )
  );
