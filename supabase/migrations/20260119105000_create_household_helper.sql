-- Create helper function to get user's household_id
-- This function is used by RLS policies across multiple tables

CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
DECLARE
  household UUID;
BEGIN
  -- Get household_id from users table for the authenticated user
  SELECT u.household_id INTO household
  FROM users u
  WHERE u.id = auth.uid();

  RETURN household;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_household_id() IS 'Returns the household_id for the currently authenticated user';
