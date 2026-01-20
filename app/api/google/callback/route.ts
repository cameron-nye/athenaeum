import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, createOAuth2ClientWithTokens } from '@/lib/google/auth';
import { encrypt } from '@/lib/crypto';

/**
 * GET /api/google/callback
 *
 * Handles the OAuth callback from Google after user grants calendar access.
 * Exchanges the authorization code for tokens, fetches available calendars,
 * and redirects to the calendar selection page.
 *
 * Requirements (REQ-2-011):
 * - Exchanges code for tokens
 * - Validates state parameter for CSRF
 * - Encrypts and stores refresh token
 * - Creates calendar_source record
 * - Fetches list of user's calendars
 * - Redirects to calendar selection page on success
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user denial or Google errors
  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(new URL('/calendars?error=oauth_denied', request.url));
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(new URL('/calendars?error=invalid_callback', request.url));
  }

  // Parse and validate CSRF state token (format: userId:randomToken)
  const [stateUserId, stateToken] = state.split(':');
  if (!stateUserId || !stateToken) {
    return NextResponse.redirect(new URL('/calendars?error=invalid_state', request.url));
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
    return NextResponse.redirect(new URL('/calendars?error=csrf_failed', request.url));
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      // This can happen if the user has already authorized before
      // and prompt=consent wasn't sufficient
      console.error('No refresh token received from Google');
      return NextResponse.redirect(new URL('/calendars?error=no_refresh_token', request.url));
    }

    // Get user's household_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.household_id) {
      console.error('Failed to get user household:', userError);
      return NextResponse.redirect(new URL('/calendars?error=no_household', request.url));
    }

    // Encrypt tokens for storage
    const accessTokenEncrypted = tokens.access_token ? encrypt(tokens.access_token) : null;
    const refreshTokenEncrypted = encrypt(tokens.refresh_token);

    // Create OAuth2 client with tokens to fetch calendars
    const auth = createOAuth2ClientWithTokens(tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch user's calendar list
    const calendarListResponse = await calendar.calendarList.list();
    const calendars = calendarListResponse.data.items ?? [];

    if (calendars.length === 0) {
      return NextResponse.redirect(new URL('/calendars?error=no_calendars', request.url));
    }

    // Store calendars temporarily in a session-like mechanism
    // For now, we'll create calendar_source records for each calendar
    // (enabled=false until user selects which ones to enable)
    const calendarData = calendars.map((cal) => ({
      household_id: userData.household_id,
      user_id: user.id,
      provider: 'google' as const,
      external_id: cal.id!,
      name: cal.summary ?? 'Unnamed Calendar',
      color: cal.backgroundColor ?? null,
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      enabled: false, // User will enable selected calendars on next page
    }));

    // Insert or update calendar sources (upsert based on unique constraint)
    const { error: insertError } = await supabase.from('calendar_sources').upsert(calendarData, {
      onConflict: 'household_id,provider,external_id',
      ignoreDuplicates: false,
    });

    if (insertError) {
      console.error('Failed to insert calendar sources:', insertError);
      return NextResponse.redirect(new URL('/calendars?error=db_error', request.url));
    }

    // Redirect to calendar selection page
    return NextResponse.redirect(new URL('/calendars/connect', request.url));
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/calendars?error=callback_failed', request.url));
  }
}
