/**
 * Photo Source Sync API
 * REQ-4-024: Create Google Photos album sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { fetchAllPhotosFromAlbum, downloadPhoto } from '@/lib/google/photos';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/photos/sources/sync - Sync photos from a photo source
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { source_id } = await request.json();

    if (!source_id) {
      return NextResponse.json({ error: 'Missing source_id' }, { status: 400 });
    }

    // Get the photo source with tokens
    const { data: source, error: sourceError } = await supabase
      .from('photo_sources')
      .select('*')
      .eq('id', source_id)
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Photo source not found' }, { status: 404 });
    }

    // Decrypt tokens
    const accessToken = source.access_token_encrypted
      ? decrypt(source.access_token_encrypted)
      : null;
    const refreshToken = source.refresh_token_encrypted
      ? decrypt(source.refresh_token_encrypted)
      : null;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token available' }, { status: 400 });
    }

    // Fetch photos from Google Photos album
    const photos = await fetchAllPhotosFromAlbum(source.album_id, {
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Track sync results
    let photosAdded = 0;
    let photosSkipped = 0;
    const errors: string[] = [];

    // Process each photo
    for (const mediaItem of photos) {
      try {
        // Check if photo already exists (by external ID)
        const { data: existing } = await supabase
          .from('photos')
          .select('id')
          .eq('household_id', source.household_id)
          .eq('filename', `gp_${mediaItem.id}`)
          .single();

        if (existing) {
          photosSkipped++;
          continue;
        }

        // Download the photo
        const photoBuffer = await downloadPhoto(mediaItem);

        // Generate unique storage path
        const extension = mediaItem.filename.split('.').pop() || 'jpg';
        const uniqueFilename = `gp_${mediaItem.id}.${extension}`;
        const storagePath = `${source.household_id}/${uniqueFilename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(storagePath, photoBuffer, {
            contentType: mediaItem.mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${mediaItem.id}:`, uploadError);
          errors.push(`Failed to upload ${mediaItem.filename}`);
          continue;
        }

        // Extract dimensions from metadata
        const width = mediaItem.mediaMetadata?.width
          ? parseInt(mediaItem.mediaMetadata.width, 10)
          : null;
        const height = mediaItem.mediaMetadata?.height
          ? parseInt(mediaItem.mediaMetadata.height, 10)
          : null;
        const takenAt = mediaItem.mediaMetadata?.creationTime || null;

        // Create database record
        const { error: dbError } = await supabase.from('photos').insert({
          id: uuidv4(),
          household_id: source.household_id,
          uploaded_by: source.user_id,
          storage_path: storagePath,
          filename: `gp_${mediaItem.id}`,
          width,
          height,
          taken_at: takenAt,
          album: source.album_name,
          enabled: true,
        });

        if (dbError) {
          console.error(`DB error for ${mediaItem.id}:`, dbError);
          errors.push(`Failed to save ${mediaItem.filename}`);
          // Clean up uploaded file
          await supabase.storage.from('photos').remove([storagePath]);
          continue;
        }

        photosAdded++;
      } catch (err) {
        console.error(`Error processing ${mediaItem.id}:`, err);
        errors.push(`Failed to process ${mediaItem.filename}`);
      }
    }

    // Update source sync status
    await supabase
      .from('photo_sources')
      .update({
        last_synced_at: new Date().toISOString(),
        photo_count: photosAdded + photosSkipped,
      })
      .eq('id', source_id);

    return NextResponse.json({
      success: true,
      photos_added: photosAdded,
      photos_skipped: photosSkipped,
      total: photos.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync photos', details: String(error) },
      { status: 500 }
    );
  }
}
