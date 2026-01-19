-- Create indexes for events table performance
-- REQ-2-005: Events Table Indexes

-- Index for querying events by calendar source and time (common for fetching a calendar's events)
CREATE INDEX idx_events_calendar_time ON events (calendar_source_id, start_time);

-- Index for querying events within a time range (common for calendar views)
CREATE INDEX idx_events_time_range ON events (start_time, end_time);
