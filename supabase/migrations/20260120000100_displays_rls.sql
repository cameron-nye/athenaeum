-- Enable Row Level Security on displays table
-- Phase 3: Display access policies

ALTER TABLE displays ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view displays in their own household
CREATE POLICY "Users can view own household displays"
  ON displays
  FOR SELECT
  USING (household_id = get_user_household_id());

-- INSERT: Users can add displays to their own household
CREATE POLICY "Users can add displays to own household"
  ON displays
  FOR INSERT
  WITH CHECK (household_id = get_user_household_id());

-- UPDATE: Users can update their own household's displays
CREATE POLICY "Users can update own household displays"
  ON displays
  FOR UPDATE
  USING (household_id = get_user_household_id())
  WITH CHECK (household_id = get_user_household_id());

-- DELETE: Users can delete their own household's displays
CREATE POLICY "Users can delete own household displays"
  ON displays
  FOR DELETE
  USING (household_id = get_user_household_id());

-- Helper function to get household_id from display token
-- Used by display devices for read-only access
CREATE OR REPLACE FUNCTION get_display_household_id()
RETURNS UUID AS $$
DECLARE
  display_token TEXT;
  household UUID;
BEGIN
  -- Get token from request header (set by Supabase client)
  display_token := current_setting('request.headers', true)::json->>'x-display-token';

  IF display_token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT d.household_id INTO household
  FROM displays d
  WHERE d.auth_token = display_token;

  RETURN household;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Display devices can read their own record (for settings)
CREATE POLICY "Display can read own record"
  ON displays
  FOR SELECT
  USING (auth_token = current_setting('request.headers', true)::json->>'x-display-token');

-- Display devices can update their own last_seen_at (heartbeat)
CREATE POLICY "Display can update own heartbeat"
  ON displays
  FOR UPDATE
  USING (auth_token = current_setting('request.headers', true)::json->>'x-display-token')
  WITH CHECK (auth_token = current_setting('request.headers', true)::json->>'x-display-token');
