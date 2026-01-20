-- Enable Row Level Security on chores table
-- REQ-5-004: RLS policies for chores

ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view chores in their own household
CREATE POLICY "Users can view own household chores"
  ON chores
  FOR SELECT
  USING (household_id = get_user_household_id());

-- INSERT: Users can add chores to their own household
CREATE POLICY "Users can add chores to own household"
  ON chores
  FOR INSERT
  WITH CHECK (household_id = get_user_household_id());

-- UPDATE: Users can update their own household's chores
CREATE POLICY "Users can update own household chores"
  ON chores
  FOR UPDATE
  USING (household_id = get_user_household_id())
  WITH CHECK (household_id = get_user_household_id());

-- DELETE: Users can delete their own household's chores
CREATE POLICY "Users can delete own household chores"
  ON chores
  FOR DELETE
  USING (household_id = get_user_household_id());
