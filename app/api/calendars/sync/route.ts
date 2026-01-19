import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncCalendarEvents, SyncResult } from '@/lib/google/calendar';

/**
 * Rate limit tracking using in-memory store.
 * In production, consider using Redis or similar for distributed rate limiting.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per calendar

/**
 * Checks if a calendar sync request should be rate limited.
 *
 * @param calendarSourceId - UUID of the calendar_source
 * @returns true if request should be blocked
 */
function isRateLimited(calendarSourceId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(calendarSourceId);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(calendarSourceId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

/**
 * POST /api/calendars/sync
 *
 * Manually triggers a sync for a specific calendar source.
 * Requires authentication and validates user has access to the calendar.
 *
 * Request body:
 *   { calendar_source_id: string }
 *
 * Response:
 *   { success: boolean, events_upserted: number, events_deleted: number, error?: string }
 *
 * Requirements (REQ-2-016):
 * - POST handler triggers sync for specified calendar_source_id
 * - Validates user has access to calendar
 * - Returns sync status and event count
 * - Handles errors and returns appropriate status codes
 * - Rate limited to prevent abuse
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let body: { calendar_source_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { calendar_source_id } = body;

  if (!calendar_source_id) {
    return NextResponse.json({ error: 'calendar_source_id is required' }, { status: 400 });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(calendar_source_id)) {
    return NextResponse.json({ error: 'Invalid calendar_source_id format' }, { status: 400 });
  }

  // Check rate limit
  if (isRateLimited(calendar_source_id)) {
    return NextResponse.json(
      { error: 'Too many sync requests. Please wait before trying again.' },
      { status: 429 }
    );
  }

  // Get user's household_id
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.household_id) {
    return NextResponse.json({ error: 'User not found or no household' }, { status: 400 });
  }

  // Fetch the calendar source and verify household access
  const { data: calendarSource, error: calendarError } = await supabase
    .from('calendar_sources')
    .select('id, external_id, access_token_encrypted, refresh_token_encrypted, sync_token')
    .eq('id', calendar_source_id)
    .eq('household_id', userData.household_id)
    .single();

  if (calendarError || !calendarSource) {
    return NextResponse.json({ error: 'Calendar not found or access denied' }, { status: 404 });
  }

  // Perform the sync
  const result: SyncResult = await syncCalendarEvents(supabase, calendarSource);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        events_upserted: 0,
        events_deleted: 0,
        error: result.error ?? 'Sync failed',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    events_upserted: result.eventsUpserted,
    events_deleted: result.eventsDeleted,
  });
}
