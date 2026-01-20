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

-- REQ-5-031: Add chores to seed data
-- Create a second user for assignment variety
INSERT INTO users (id, household_id, email, name, display_name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'family@example.com',
  'Family Member',
  'Alex',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Update first user with display_name
UPDATE users
SET display_name = 'Sam'
WHERE id = '00000000-0000-0000-0000-000000000002';

-- Create sample chores
INSERT INTO chores (id, household_id, title, description, icon, points, created_at)
VALUES
  -- Kitchen chores
  (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000001',
    'Do the Dishes',
    'Wash, dry, and put away all dishes',
    '🍽️',
    5,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000001',
    'Take Out Trash',
    'Empty all trash cans and take to curb',
    '🗑️',
    3,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000001',
    'Clean Kitchen',
    'Wipe counters, clean stovetop, mop floor',
    '🧽',
    10,
    now()
  ),
  -- Living spaces
  (
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000001',
    'Vacuum Living Room',
    'Vacuum carpet and under furniture',
    '🧹',
    7,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000001',
    'Dust Furniture',
    'Dust all surfaces in common areas',
    '✨',
    5,
    now()
  ),
  -- Laundry
  (
    '00000000-0000-0000-0000-000000000025',
    '00000000-0000-0000-0000-000000000001',
    'Do Laundry',
    'Wash, dry, and fold one load',
    '👕',
    8,
    now()
  ),
  -- Outdoor
  (
    '00000000-0000-0000-0000-000000000026',
    '00000000-0000-0000-0000-000000000001',
    'Mow the Lawn',
    'Cut grass and edge walkways',
    '🌿',
    15,
    now()
  ),
  -- Pet care
  (
    '00000000-0000-0000-0000-000000000027',
    '00000000-0000-0000-0000-000000000001',
    'Feed the Dog',
    'Morning and evening feeding',
    '🐕',
    2,
    now()
  ),
  -- Bathroom
  (
    '00000000-0000-0000-0000-000000000028',
    '00000000-0000-0000-0000-000000000001',
    'Clean Bathroom',
    'Scrub toilet, sink, shower, and mop floor',
    '🚿',
    10,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Create sample chore assignments with various states
DO $$
DECLARE
  today DATE := CURRENT_DATE;
  user1 UUID := '00000000-0000-0000-0000-000000000002';
  user2 UUID := '00000000-0000-0000-0000-000000000003';
  dishes_chore UUID := '00000000-0000-0000-0000-000000000020';
  trash_chore UUID := '00000000-0000-0000-0000-000000000021';
  kitchen_chore UUID := '00000000-0000-0000-0000-000000000022';
  vacuum_chore UUID := '00000000-0000-0000-0000-000000000023';
  dust_chore UUID := '00000000-0000-0000-0000-000000000024';
  laundry_chore UUID := '00000000-0000-0000-0000-000000000025';
  lawn_chore UUID := '00000000-0000-0000-0000-000000000026';
  dog_chore UUID := '00000000-0000-0000-0000-000000000027';
  bathroom_chore UUID := '00000000-0000-0000-0000-000000000028';
BEGIN
  INSERT INTO chore_assignments (
    id, chore_id, assigned_to, due_date, recurrence_rule, completed_at, created_at
  )
  VALUES
    -- Overdue: Dishes from yesterday (not completed)
    (
      '00000000-0000-0000-0000-000000000030',
      dishes_chore, user1, today - 1, NULL, NULL, now()
    ),
    -- Today: Trash (not completed)
    (
      '00000000-0000-0000-0000-000000000031',
      trash_chore, user2, today, NULL, NULL, now()
    ),
    -- Today: Feed dog (completed)
    (
      '00000000-0000-0000-0000-000000000032',
      dog_chore, user1, today, 'FREQ=DAILY', now() - INTERVAL '2 hours', now()
    ),
    -- Today: Dishes (not completed) - recurring daily
    (
      '00000000-0000-0000-0000-000000000033',
      dishes_chore, user2, today, 'FREQ=DAILY', NULL, now()
    ),
    -- Tomorrow: Vacuum
    (
      '00000000-0000-0000-0000-000000000034',
      vacuum_chore, user1, today + 1, 'FREQ=WEEKLY;BYDAY=TU', NULL, now()
    ),
    -- Tomorrow: Laundry (unassigned)
    (
      '00000000-0000-0000-0000-000000000035',
      laundry_chore, NULL, today + 1, NULL, NULL, now()
    ),
    -- Day after tomorrow: Clean kitchen
    (
      '00000000-0000-0000-0000-000000000036',
      kitchen_chore, user2, today + 2, 'FREQ=WEEKLY;BYDAY=TH', NULL, now()
    ),
    -- This weekend: Mow lawn
    (
      '00000000-0000-0000-0000-000000000037',
      lawn_chore, user1, today + (6 - EXTRACT(DOW FROM today)::INTEGER), 'FREQ=WEEKLY;BYDAY=SA', NULL, now()
    ),
    -- Next week: Dust furniture
    (
      '00000000-0000-0000-0000-000000000038',
      dust_chore, user2, today + 7, 'FREQ=BIWEEKLY', NULL, now()
    ),
    -- Overdue: Clean bathroom from 3 days ago (not completed)
    (
      '00000000-0000-0000-0000-000000000039',
      bathroom_chore, user1, today - 3, 'FREQ=WEEKLY;BYDAY=MO', NULL, now()
    )
  ON CONFLICT (id) DO NOTHING;
END $$;
