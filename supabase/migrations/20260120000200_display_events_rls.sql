-- REQ-3-027: Allow display devices to read their household's events
-- Display devices use x-display-token header for authentication

-- Display devices can read events from their household's enabled calendars
CREATE POLICY "Display can read household events"
  ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_sources cs
      WHERE cs.id = events.calendar_source_id
        AND cs.enabled = true
        AND cs.household_id = get_display_household_id()
    )
  );

-- Display devices can read enabled calendar sources for their household
CREATE POLICY "Display can read household calendar sources"
  ON calendar_sources
  FOR SELECT
  USING (
    household_id = get_display_household_id()
    AND enabled = true
  );
