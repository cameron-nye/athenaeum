/**
 * Photos API route for upload and listing
 * REQ-4-007: Implement photo upload API
 * REQ-4-028: Handle photo storage quota
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getHouseholdStorageUsage,
  wouldExceedQuota,
  DEFAULT_QUOTA_BYTES,
  formatBytes,
} from '@/lib/photos/storage-quota';

/**
 * GET /api/photos - List photos for the user's household
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get optional album filter from query params
  const { searchParams } = new URL(request.url);
  const album = searchParams.get('album');
  const enabledOnly = searchParams.get('enabled') === 'true';

  let query = supabase.from('photos').select('*').order('created_at', { ascending: false });

  if (album) {
    query = query.eq('album', album);
  }

  if (enabledOnly) {
    query = query.eq('enabled', true);
  }

  const { data: photos, error } = await query;

  if (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }

  return NextResponse.json({ photos });
}

/**
 * POST /api/photos - Upload a new photo
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's household
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.household_id) {
    return NextResponse.json({ error: 'User not in a household' }, { status: 400 });
  }

  const householdId = userData.household_id;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const album = formData.get('album') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
    }

    // Check storage quota (REQ-4-028)
    const usage = await getHouseholdStorageUsage(supabase, householdId, DEFAULT_QUOTA_BYTES);

    if (wouldExceedQuota(usage, file.size)) {
      const usedStr = formatBytes(usage.usedBytes);
      const quotaStr = formatBytes(usage.quotaBytes);
      const fileSizeStr = formatBytes(file.size);
      return NextResponse.json(
        {
          error: `Storage quota exceeded. Using ${usedStr} of ${quotaStr}. File size: ${fileSizeStr}. Delete some photos to upload more.`,
          quotaExceeded: true,
          usage: {
            usedBytes: usage.usedBytes,
            quotaBytes: usage.quotaBytes,
            usedPercent: usage.usedPercent,
          },
        },
        { status: 413 } // Payload Too Large
      );
    }

    // Generate unique filename
    const extension = file.name.split('.').pop() || 'jpg';
    const uniqueFilename = `${uuidv4()}.${extension}`;
    const storagePath = `${householdId}/${uniqueFilename}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Extract image dimensions using sharp or browser API
    // For now, we'll store null and let client handle it if needed
    let width: number | null = null;
    let height: number | null = null;
    let takenAt: string | null = null;

    // Try to extract dimensions from image
    try {
      const { getImageDimensions, extractExifDate } = await import('@/lib/photos/image-utils');
      const buffer = Buffer.from(fileBuffer);
      const dimensions = await getImageDimensions(buffer);
      width = dimensions.width;
      height = dimensions.height;
      takenAt = await extractExifDate(buffer);
    } catch {
      // Image processing failed, continue without dimensions
      console.warn('Could not extract image dimensions/EXIF');
    }

    // Create database record
    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        household_id: householdId,
        uploaded_by: user.id,
        storage_path: storagePath,
        filename: file.name,
        width,
        height,
        taken_at: takenAt,
        album: album || null,
        enabled: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('photos').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 });
    }

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}

/**
 * PATCH /api/photos - Update photo(s)
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { ids, enabled, album } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No photo IDs provided' }, { status: 400 });
    }

    const updates: Record<string, boolean | string | null> = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (album !== undefined) updates.album = album;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data: photos, error } = await supabase
      .from('photos')
      .update(updates)
      .in('id', ids)
      .select();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update photos' }, { status: 500 });
    }

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
