-- Seed data for development
-- REQ-2-039: Add calendar events to seed data
--
-- Prerequisites: Phase 1 migrations must be applied (households, users tables)
-- This seed creates sample calendar sources and events for testing.

-- Create a sample household (if Phase 1 tables exist)
-- Note: In production, households are created via user signup flow
INSERT INTO households (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Household', now())
ON CONFLICT (id) DO NOTHING;

-- Create a sample user
INSERT INTO users (id, household_id, email, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'demo@example.com',
  'Demo User',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Create sample calendar sources
INSERT INTO calendar_sources (
  id, household_id, user_id, provider, external_id, name, color, enabled, created_at
)
VALUES
  -- Work calendar (blue)
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'google',
    'work@example.com',
    'Work Calendar',
    '#2563EB',
    true,
    now()
  ),
  -- Family calendar (green)
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'google',
    'family@example.com',
    'Family Calendar',
    '#16A34A',
    true,
    now()
  ),
  -- Personal calendar (purple)
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'google',
    'personal@example.com',
    'Personal',
    '#9333EA',
    true,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Create sample events spanning different dates
-- Use current date calculations for realistic data
DO $$
DECLARE
  today DATE := CURRENT_DATE;
  work_cal UUID := '00000000-0000-0000-0000-000000000010';
  family_cal UUID := '00000000-0000-0000-0000-000000000011';
  personal_cal UUID := '00000000-0000-0000-0000-000000000012';
BEGIN
  -- Work Calendar Events
  INSERT INTO events (
    id, calendar_source_id, external_id, title, description, location,
    start_time, end_time, all_day, raw_data, created_at
  )
  VALUES
    -- Today: Team Standup
    (
      gen_random_uuid(), work_cal, 'work-standup-1',
      'Team Standup', 'Daily sync with the engineering team', 'Meeting Room A',
      (today + TIME '09:00:00')::TIMESTAMPTZ,
      (today + TIME '09:30:00')::TIMESTAMPTZ,
      false, '{}', now()
    ),
    -- Today: Sprint Planning
    (
      gen_random_uuid(), work_cal, 'work-sprint-1',
      'Sprint Planning', 'Q1 sprint planning session', 'Conference Room B',
      (today + TIME '14:00:00')::TIMESTAMPTZ,
      (today + TIME '16:00:00')::TIMESTAMPTZ,
      false, '{}', now()
    ),
    -- Tomorrow: Project Review
    (
      gen_random_uuid(), work_cal, 'work-review-1',
      'Project Review', 'Weekly project status update', 'Virtual (Zoom)',
      ((today + 1) + TIME '10:00:00')::TIMESTAMPTZ,
      ((today + 1) + TIME '11:00:00')::TIMESTAMPTZ,
      false, '{}', now()
    ),
    -- Next week: Workshop
    (
      gen_random_uuid(), work_cal, 'work-workshop-1',
      'Technical Workshop', 'React 19 deep dive session', 'Training Room',
      ((today + 7) + TIME '13:00:00')::TIMESTAMPTZ,
      ((today + 7) + TIME '17:00:00')::TIMESTAMPTZ,
      false, '{}', now()
    )
  ON CONFLICT (calendar_source_id, external_id) DO NOTHING;

  -- Family Calendar Events
  INSERT INTO events (
    id, calendar_source_id, external_id, title, description, location,
    start_time, end_time, all_day, raw_data, created_at
  )
  VALUES
    -- Tomorrow: Dinner
    (
      gen_random_uuid(), family_cal, 'family-dinner-1',
      'Family Dinner', 'Weekly family dinner', 'Home',
      ((today + 1) + TIME '18:30:00')::TIMESTAMPTZ,
      ((today + 1) + TIME '20:00:00')::TIMESTAMPTZ,
      false, '{}', now()
    ),
    -- Weekend: Soccer Game (all-day event on Saturday)
    (
      gen_random_uuid(), family_cal, 'family-soccer-1',
      'Kids Soccer Tournament', 'Regional youth soccer championship', 'City Sports Complex',
      (today + (6 - EXTRACT(DOW FROM today)::INTEGER))::DATE::TIMESTAMPTZ,
      (today + (7 - EXTRACT(DOW FROM today)::INTEGER))::DATE::TIMESTAMPTZ,
      true, '{}', now()
    ),
    -- Multi-day: Vacation (next week, 5 days)
    (
      gen_random_uuid(), family_cal, 'family-vacation-1',
      'Summer Vacation', 'Family beach trip', 'Outer Banks, NC',
      (today + 14)::DATE::TIMESTAMPTZ,
      (today + 19)::DATE::TIMESTAMPTZ,
      true, '{}', now()
    )
  ON CONFLICT (calendar_source_id, external_id) DO NOTHING;

  -- Personal Calendar Events
  INSERT INTO events (
    id, calendar_source_id, external_id, title, description, location,
    start_time, end_time, all_day, raw_data, created_at
  )
  VALUES
    -- Today: Gym
    (
      gen_random_uuid(), personal_cal, 'personal-gym-1',
      'Gym Session', 'Leg day workout', 'Planet Fitness',
      (today + TIME '06:00:00')::TIMESTAMPTZ,
      (today + TIME '07:30:00')::TIMESTAMPTZ,
      false, '{}', now()
    ),
    -- Tomorrow: Dentist
    (
      gen_random_uuid(), personal_cal, 'personal-dentist-1',
      'Dentist Appointment', 'Regular checkup and cleaning', 'Bright Smiles Dental',
      ((today + 2) + TIME '11:00:00')::TIMESTAMPTZ,
      ((today + 2) + TIME '12:00:00')::TIMESTAMPTZ,
      false, '{}', now()
    ),
    -- Birthday (all-day, next month)
    (
      gen_random_uuid(), personal_cal, 'personal-birthday-1',
      'Mom''s Birthday', NULL, NULL,
      (today + 30)::DATE::TIMESTAMPTZ,
      (today + 31)::DATE::TIMESTAMPTZ,
      true, '{}', now()
    )
  ON CONFLICT (calendar_source_id, external_id) DO NOTHING;
END $$;

-- Update last_synced_at for calendar sources to simulate synced state
UPDATE calendar_sources
SET last_synced_at = now()
WHERE id IN (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012'
);
