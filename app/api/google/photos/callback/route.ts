/**
 * Google Photos OAuth callback route
 * REQ-4-022: Add Google Photos OAuth scope
 * REQ-4-023: Create Google Photos album list fetch
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/google/auth';
import { encrypt } from '@/lib/crypto';
import { fetchGooglePhotosAlbums } from '@/lib/google/photos';

/**
 * GET /api/google/photos/callback
 *
 * Handles the OAuth callback from Google after user grants Photos access.
 * Exchanges the authorization code for tokens, fetches available albums,
 * and redirects to the album selection page.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user denial or Google errors
  if (error) {
    console.error('Google Photos OAuth error:', error);
    return NextResponse.redirect(new URL('/photos/google?error=oauth_denied', request.url));
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(new URL('/photos/google?error=invalid_callback', request.url));
  }

  // Parse and validate CSRF state token (format: photos:userId:randomToken)
  const [prefix, stateUserId, stateToken] = state.split(':');
  if (prefix !== 'photos' || !stateUserId || !stateToken) {
    return NextResponse.redirect(new URL('/photos/google?error=invalid_state', request.url));
  }

  const supabase = await createClient();

  // Verify the current user matches the state user (CSRF protection)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
  }

  if (user.id !== stateUserId) {
    console.error('CSRF validation failed: user ID mismatch');
    return NextResponse.redirect(new URL('/photos/google?error=csrf_failed', request.url));
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      console.error('No refresh token received from Google');
      return NextResponse.redirect(new URL('/photos/google?error=no_refresh_token', request.url));
    }

    // Get user's household_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.household_id) {
      console.error('Failed to get user household:', userError);
      return NextResponse.redirect(new URL('/photos/google?error=no_household', request.url));
    }

    // Encrypt tokens for storage
    const accessTokenEncrypted = tokens.access_token ? encrypt(tokens.access_token) : null;
    const refreshTokenEncrypted = encrypt(tokens.refresh_token);

    // Fetch user's Google Photos albums
    const albums = await fetchGooglePhotosAlbums(tokens);

    if (albums.length === 0) {
      // No albums found - this is OK, user might not have albums
      return NextResponse.redirect(new URL('/photos/google?error=no_albums', request.url));
    }

    // Store albums as photo_sources (enabled=false until user selects which ones to sync)
    const albumData = albums.map((album) => ({
      household_id: userData.household_id,
      user_id: user.id,
      provider: 'google' as const,
      album_id: album.id,
      album_name: album.title,
      album_cover_url: album.coverPhotoBaseUrl || null,
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      photo_count: album.mediaItemsCount ? parseInt(album.mediaItemsCount, 10) : 0,
      enabled: false, // User will enable selected albums on next page
    }));

    // Insert or update photo sources (upsert based on unique constraint)
    const { error: insertError } = await supabase.from('photo_sources').upsert(albumData, {
      onConflict: 'household_id,provider,album_id',
      ignoreDuplicates: false,
    });

    if (insertError) {
      console.error('Failed to insert photo sources:', insertError);
      return NextResponse.redirect(new URL('/photos/google?error=db_error', request.url));
    }

    // Redirect to album selection page
    return NextResponse.redirect(new URL('/photos/google/connect', request.url));
  } catch (err) {
    console.error('Google Photos OAuth callback error:', err);
    return NextResponse.redirect(new URL('/photos/google?error=callback_failed', request.url));
  }
}
