/**
 * Photo Sync Cron Job
 * REQ-4-027: Create photo sync background job
 *
 * This cron job syncs photos from enabled Google Photos sources
 * that haven't been synced recently (default: 24 hours).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { decrypt, encrypt } from '@/lib/crypto';
import {
  fetchAllPhotosFromAlbum,
  downloadPhoto,
  categorizePhotosApiError,
} from '@/lib/google/photos';
import { TokenRevocationError } from '@/lib/google/auth';
import { v4 as uuidv4 } from 'uuid';

// Sync sources that haven't synced in 24 hours
const STALE_THRESHOLD_HOURS = 24;

/**
 * GET /api/cron/photos
 *
 * Triggered by Vercel Cron to sync stale photo sources.
 * Requires CRON_SECRET for authentication.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find enabled photo sources that need syncing
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000);

  const { data: sources, error: sourcesError } = await supabase
    .from('photo_sources')
    .select('*')
    .eq('enabled', true)
    .eq('provider', 'google')
    .or(`last_synced_at.is.null,last_synced_at.lt.${staleThreshold.toISOString()}`);

  if (sourcesError) {
    console.error('Error fetching stale sources:', sourcesError);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }

  if (!sources || sources.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No sources need syncing',
      sources_checked: 0,
    });
  }

  const results: Array<{
    source_id: string;
    album_name: string;
    success: boolean;
    photos_added?: number;
    photos_skipped?: number;
    error?: string;
    disconnected?: boolean;
  }> = [];

  // Process each source
  for (const source of sources) {
    try {
      // Decrypt tokens
      const accessToken = source.access_token_encrypted
        ? decrypt(source.access_token_encrypted)
        : null;
      const refreshToken = source.refresh_token_encrypted
        ? decrypt(source.refresh_token_encrypted)
        : null;

      if (!refreshToken) {
        results.push({
          source_id: source.id,
          album_name: source.album_name,
          success: false,
          error: 'No refresh token',
        });
        continue;
      }

      // Token refresh callback
      const onTokenRefresh = async (newTokens: { access_token?: string | null }) => {
        if (newTokens.access_token) {
          await supabase
            .from('photo_sources')
            .update({
              access_token_encrypted: encrypt(newTokens.access_token),
            })
            .eq('id', source.id);
        }
      };

      // Fetch photos from album
      const photos = await fetchAllPhotosFromAlbum(
        source.album_id,
        {
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        onTokenRefresh
      );

      let photosAdded = 0;
      let photosSkipped = 0;

      // Process each photo
      for (const mediaItem of photos) {
        // Check if photo already exists
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

        try {
          // Download and upload photo
          const photoBuffer = await downloadPhoto(mediaItem);
          const extension = mediaItem.filename.split('.').pop() || 'jpg';
          const uniqueFilename = `gp_${mediaItem.id}.${extension}`;
          const storagePath = `${source.household_id}/${uniqueFilename}`;

          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(storagePath, photoBuffer, {
              contentType: mediaItem.mimeType,
              upsert: true,
            });

          if (uploadError) {
            console.error(`Upload error for ${mediaItem.id}:`, uploadError);
            continue;
          }

          // Create database record
          const width = mediaItem.mediaMetadata?.width
            ? parseInt(mediaItem.mediaMetadata.width, 10)
            : null;
          const height = mediaItem.mediaMetadata?.height
            ? parseInt(mediaItem.mediaMetadata.height, 10)
            : null;

          await supabase.from('photos').insert({
            id: uuidv4(),
            household_id: source.household_id,
            uploaded_by: source.user_id,
            storage_path: storagePath,
            filename: `gp_${mediaItem.id}`,
            width,
            height,
            taken_at: mediaItem.mediaMetadata?.creationTime || null,
            album: source.album_name,
            enabled: true,
          });

          photosAdded++;
        } catch (err) {
          console.error(`Error processing ${mediaItem.id}:`, err);
        }
      }

      // Update source sync status
      await supabase
        .from('photo_sources')
        .update({
          last_synced_at: new Date().toISOString(),
          photo_count: photosAdded + photosSkipped,
        })
        .eq('id', source.id);

      results.push({
        source_id: source.id,
        album_name: source.album_name,
        success: true,
        photos_added: photosAdded,
        photos_skipped: photosSkipped,
      });
    } catch (error) {
      const errorType = categorizePhotosApiError(error);

      // Handle auth errors by disabling the source
      if (error instanceof TokenRevocationError || errorType === 'auth') {
        await supabase
          .from('photo_sources')
          .update({
            enabled: false,
            access_token_encrypted: null,
            refresh_token_encrypted: null,
          })
          .eq('id', source.id);

        results.push({
          source_id: source.id,
          album_name: source.album_name,
          success: false,
          error: 'Auth revoked',
          disconnected: true,
        });
      } else {
        results.push({
          source_id: source.id,
          album_name: source.album_name,
          success: false,
          error: String(error),
        });
      }
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    sources_processed: sources.length,
    successful,
    failed,
    results,
  });
}
