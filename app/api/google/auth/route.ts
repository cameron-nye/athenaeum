import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAuthUrl } from '@/lib/google/auth';
import { randomBytes } from 'crypto';

/**
 * GET /api/google/auth
 *
 * Initiates the Google OAuth flow for calendar access.
 * Generates a CSRF state token and redirects to Google's consent page.
 *
 * Requirements:
 * - User must be authenticated
 * - Scopes include calendar.readonly at minimum
 * - State parameter includes CSRF protection
 */
export async function GET() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generate CSRF state token
  // Format: userId:randomToken for verification in callback
  const randomToken = randomBytes(32).toString('hex');
  const state = `${user.id}:${randomToken}`;

  // Generate OAuth URL with calendar scopes
  const authUrl = generateAuthUrl(state, [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly',
  ]);

  // Redirect to Google OAuth consent page
  return NextResponse.redirect(authUrl);
}
