-- Enable Row Level Security on calendar_sources table
-- REQ-2-006: RLS policies for calendar sources

ALTER TABLE calendar_sources ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view calendar sources in their own household
CREATE POLICY "Users can view own household calendar sources"
  ON calendar_sources
  FOR SELECT
  USING (household_id = get_user_household_id());

-- INSERT: Users can add calendar sources to their own household
CREATE POLICY "Users can add calendar sources to own household"
  ON calendar_sources
  FOR INSERT
  WITH CHECK (household_id = get_user_household_id());

-- UPDATE: Users can update their own household's calendar sources
CREATE POLICY "Users can update own household calendar sources"
  ON calendar_sources
  FOR UPDATE
  USING (household_id = get_user_household_id())
  WITH CHECK (household_id = get_user_household_id());

-- DELETE: Users can delete their own household's calendar sources
CREATE POLICY "Users can delete own household calendar sources"
  ON calendar_sources
  FOR DELETE
  USING (household_id = get_user_household_id());
