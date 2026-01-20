-- Enable Row Level Security on photos table
-- Phase 4: Photos access policies
-- REQ-4-002

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view photos in their own household
CREATE POLICY "Users can view own household photos"
  ON photos
  FOR SELECT
  USING (household_id = get_user_household_id());

-- INSERT: Users can add photos to their own household
CREATE POLICY "Users can add photos to own household"
  ON photos
  FOR INSERT
  WITH CHECK (household_id = get_user_household_id());

-- UPDATE: Users can update their own household's photos
CREATE POLICY "Users can update own household photos"
  ON photos
  FOR UPDATE
  USING (household_id = get_user_household_id())
  WITH CHECK (household_id = get_user_household_id());

-- DELETE: Users can delete their own household's photos
CREATE POLICY "Users can delete own household photos"
  ON photos
  FOR DELETE
  USING (household_id = get_user_household_id());

-- Display devices can read enabled photos from their household (slideshow)
CREATE POLICY "Display can read household photos"
  ON photos
  FOR SELECT
  USING (
    household_id = get_display_household_id()
    AND enabled = true
  );
