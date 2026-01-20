-- Enable Row Level Security on storage.objects for photos bucket
-- Phase 4: Photos storage policies
-- REQ-4-004

-- SELECT: Users can read photos from their own household folder
CREATE POLICY "Users can read own household photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = get_user_household_id()::text
  );

-- INSERT: Users can upload photos to their own household folder
CREATE POLICY "Users can upload to own household folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = get_user_household_id()::text
  );

-- UPDATE: Users can update photos in their own household folder
CREATE POLICY "Users can update own household photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = get_user_household_id()::text
  )
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = get_user_household_id()::text
  );

-- DELETE: Users can delete photos from their own household folder
CREATE POLICY "Users can delete from own household folder"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = get_user_household_id()::text
  );

-- Display devices can read photos from their household folder (slideshow)
CREATE POLICY "Display can read household photos storage"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = get_display_household_id()::text
  );
