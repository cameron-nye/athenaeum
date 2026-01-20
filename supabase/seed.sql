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

-- REQ-4-034: Add photos to seed data
-- Note: These are placeholder records. For actual images:
-- 1. Upload photos via the dashboard UI, or
-- 2. Manually upload to Supabase Storage 'photos' bucket at:
--    photos/00000000-0000-0000-0000-000000000001/{filename}
-- and these records will display correctly.

INSERT INTO photos (
  id, household_id, uploaded_by, storage_path, filename, width, height,
  taken_at, album, enabled, created_at
)
VALUES
  -- Family photos
  (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/beach-sunset.jpg',
    'beach-sunset.jpg',
    1920, 1080,
    (CURRENT_DATE - 30)::TIMESTAMPTZ,
    'Vacation',
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/family-portrait.jpg',
    'family-portrait.jpg',
    1200, 1600,
    (CURRENT_DATE - 60)::TIMESTAMPTZ,
    'Family',
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/birthday-cake.jpg',
    'birthday-cake.jpg',
    1600, 1200,
    (CURRENT_DATE - 14)::TIMESTAMPTZ,
    'Family',
    true,
    now()
  ),
  -- Nature photos
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/mountain-view.jpg',
    'mountain-view.jpg',
    1920, 1280,
    (CURRENT_DATE - 90)::TIMESTAMPTZ,
    'Nature',
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/autumn-leaves.jpg',
    'autumn-leaves.jpg',
    1600, 1200,
    (CURRENT_DATE - 120)::TIMESTAMPTZ,
    'Nature',
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000105',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/flower-macro.jpg',
    'flower-macro.jpg',
    1200, 1200,
    (CURRENT_DATE - 45)::TIMESTAMPTZ,
    'Nature',
    true,
    now()
  ),
  -- Vacation photos
  (
    '00000000-0000-0000-0000-000000000106',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/hotel-pool.jpg',
    'hotel-pool.jpg',
    1920, 1080,
    (CURRENT_DATE - 28)::TIMESTAMPTZ,
    'Vacation',
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000107',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/city-skyline.jpg',
    'city-skyline.jpg',
    1920, 1080,
    (CURRENT_DATE - 25)::TIMESTAMPTZ,
    'Vacation',
    true,
    now()
  ),
  -- Pet photos (no album)
  (
    '00000000-0000-0000-0000-000000000108',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/cute-cat.jpg',
    'cute-cat.jpg',
    1400, 1400,
    (CURRENT_DATE - 7)::TIMESTAMPTZ,
    NULL,
    true,
    now()
  ),
  -- Disabled photo (for testing)
  (
    '00000000-0000-0000-0000-000000000109',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'photos/00000000-0000-0000-0000-000000000001/test-disabled.jpg',
    'test-disabled.jpg',
    800, 600,
    (CURRENT_DATE - 180)::TIMESTAMPTZ,
    NULL,
    false,
    now()
  )
ON CONFLICT (id) DO NOTHING;
