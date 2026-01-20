-- Create storage bucket for photos
-- Phase 4: Photos feature
-- REQ-4-003

-- Create the photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE storage.objects IS 'Supabase Storage objects including photos bucket';
