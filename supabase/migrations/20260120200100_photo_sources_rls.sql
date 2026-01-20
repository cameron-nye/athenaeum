-- Enable Row Level Security on photo_sources table
-- REQ-4-026: RLS policies for photo sources

ALTER TABLE photo_sources ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view photo sources in their own household
CREATE POLICY "Users can view own household photo sources"
  ON photo_sources
  FOR SELECT
  USING (household_id = get_user_household_id());

-- INSERT: Users can add photo sources to their own household
CREATE POLICY "Users can add photo sources to own household"
  ON photo_sources
  FOR INSERT
  WITH CHECK (household_id = get_user_household_id());

-- UPDATE: Users can update their own household's photo sources
CREATE POLICY "Users can update own household photo sources"
  ON photo_sources
  FOR UPDATE
  USING (household_id = get_user_household_id())
  WITH CHECK (household_id = get_user_household_id());

-- DELETE: Users can delete their own household's photo sources
CREATE POLICY "Users can delete own household photo sources"
  ON photo_sources
  FOR DELETE
  USING (household_id = get_user_household_id());
