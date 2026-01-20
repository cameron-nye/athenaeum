/**
 * Google Photos OAuth initiation route
 * REQ-4-022: Add Google Photos OAuth scope
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePhotosAuthUrl } from '@/lib/google/auth';
import { randomBytes } from 'crypto';

/**
 * GET /api/google/photos/auth
 *
 * Initiates the Google OAuth flow for Google Photos access.
 * Uses photoslibrary.readonly scope for read-only album access.
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
  // Format: photos:userId:randomToken for verification in callback
  const randomToken = randomBytes(32).toString('hex');
  const state = `photos:${user.id}:${randomToken}`;

  // Generate OAuth URL with photos scope
  const authUrl = generatePhotosAuthUrl(state);

  // Redirect to Google OAuth consent page
  return NextResponse.redirect(authUrl);
}
