-- Enable Row Level Security on events table
-- REQ-2-007: RLS policies for events
-- Policies join through calendar_sources to check household membership

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view events from their own household's calendars
CREATE POLICY "Users can view own household events"
  ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_sources cs
      WHERE cs.id = events.calendar_source_id
        AND cs.household_id = get_user_household_id()
    )
  );

-- INSERT: Users can add events to their own household's calendars
CREATE POLICY "Users can add events to own household calendars"
  ON events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_sources cs
      WHERE cs.id = events.calendar_source_id
        AND cs.household_id = get_user_household_id()
    )
  );

-- UPDATE: Users can update their own household's events
CREATE POLICY "Users can update own household events"
  ON events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM calendar_sources cs
      WHERE cs.id = events.calendar_source_id
        AND cs.household_id = get_user_household_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_sources cs
      WHERE cs.id = events.calendar_source_id
        AND cs.household_id = get_user_household_id()
    )
  );

-- DELETE: Users can delete their own household's events
CREATE POLICY "Users can delete own household events"
  ON events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM calendar_sources cs
      WHERE cs.id = events.calendar_source_id
        AND cs.household_id = get_user_household_id()
    )
  );
