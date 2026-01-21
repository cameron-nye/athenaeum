-- Add write_enabled column to displays table
-- Display-first architecture: Allow displays to write data

ALTER TABLE displays ADD COLUMN write_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN displays.write_enabled IS 'Whether display can perform write operations (create/update chores, events)';

-- Helper function to get household_id from display token for write operations
-- Returns NULL if display doesn't have write permission
CREATE OR REPLACE FUNCTION get_display_household_id_for_write()
RETURNS UUID AS $$
DECLARE
  display_token TEXT;
  household UUID;
  can_write BOOLEAN;
BEGIN
  -- Get token from request header (set by Supabase client)
  display_token := current_setting('request.headers', true)::json->>'x-display-token';

  IF display_token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT d.household_id, d.write_enabled INTO household, can_write
  FROM displays d
  WHERE d.auth_token = display_token;

  -- Only return household if write is enabled
  IF can_write THEN
    RETURN household;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Display can read household's chores (already allowed via events RLS, add explicit)
CREATE POLICY "Display can view household chores"
  ON chores
  FOR SELECT
  USING (household_id = get_display_household_id());

-- Display can create chores in household when write enabled
CREATE POLICY "Display can create chores when write enabled"
  ON chores
  FOR INSERT
  WITH CHECK (household_id = get_display_household_id_for_write());

-- Display can update household chores when write enabled
CREATE POLICY "Display can update chores when write enabled"
  ON chores
  FOR UPDATE
  USING (household_id = get_display_household_id_for_write())
  WITH CHECK (household_id = get_display_household_id_for_write());

-- Display can read household's chore assignments
CREATE POLICY "Display can view household chore assignments"
  ON chore_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chores c
      WHERE c.id = chore_assignments.chore_id
        AND c.household_id = get_display_household_id()
    )
  );

-- Display can create chore assignments when write enabled
CREATE POLICY "Display can create chore assignments when write enabled"
  ON chore_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chores c
      WHERE c.id = chore_assignments.chore_id
        AND c.household_id = get_display_household_id_for_write()
    )
  );

-- Display can update chore assignments when write enabled
CREATE POLICY "Display can update chore assignments when write enabled"
  ON chore_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chores c
      WHERE c.id = chore_assignments.chore_id
        AND c.household_id = get_display_household_id_for_write()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chores c
      WHERE c.id = chore_assignments.chore_id
        AND c.household_id = get_display_household_id_for_write()
    )
  );
