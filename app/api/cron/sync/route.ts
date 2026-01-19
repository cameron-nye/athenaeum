import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { syncCalendarEvents, SyncResult } from '@/lib/google/calendar';

/**
 * Stale threshold in minutes.
 * Calendars not synced in this period will be synced.
 */
const STALE_THRESHOLD_MINUTES = 5;

/**
 * GET /api/cron/sync
 *
 * Background sync endpoint triggered by Vercel cron.
 * Syncs all calendar sources that haven't been synced recently.
 *
 * Requirements (REQ-2-017):
 * - GET handler validates CRON_SECRET authorization
 * - Queries calendar_sources that need sync (stale > 5 min)
 * - Syncs all stale calendars in parallel
 * - Returns count of synced calendars
 * - Handles partial failures gracefully
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Response:
 *   { calendars_synced: number, total_events_upserted: number, total_events_deleted: number, failures: number }
 */
export async function GET(request: NextRequest) {
  // Validate CRON_SECRET authorization
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Accept both "Bearer <token>" format and Vercel's direct token
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Calculate stale threshold timestamp
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  // Query enabled calendar sources that are stale
  const { data: staleCalendars, error: queryError } = await supabase
    .from('calendar_sources')
    .select('id, external_id, access_token_encrypted, refresh_token_encrypted, sync_token')
    .eq('enabled', true)
    .eq('provider', 'google')
    .or(`last_synced_at.is.null,last_synced_at.lt.${staleThreshold}`);

  if (queryError) {
    console.error('Failed to query stale calendars:', queryError);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  if (!staleCalendars || staleCalendars.length === 0) {
    return NextResponse.json({
      calendars_synced: 0,
      total_events_upserted: 0,
      total_events_deleted: 0,
      failures: 0,
    });
  }

  // Sync all stale calendars in parallel
  const syncPromises = staleCalendars.map((calendar) =>
    syncCalendarEvents(supabase, calendar).catch((error): SyncResult => {
      console.error(`Sync failed for calendar ${calendar.id}:`, error);
      return {
        success: false,
        eventsUpserted: 0,
        eventsDeleted: 0,
        newSyncToken: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    })
  );

  const results = await Promise.all(syncPromises);

  // Aggregate results
  let successCount = 0;
  let totalEventsUpserted = 0;
  let totalEventsDeleted = 0;
  let failureCount = 0;

  for (const result of results) {
    if (result.success) {
      successCount++;
      totalEventsUpserted += result.eventsUpserted;
      totalEventsDeleted += result.eventsDeleted;
    } else {
      failureCount++;
    }
  }

  return NextResponse.json({
    calendars_synced: successCount,
    total_events_upserted: totalEventsUpserted,
    total_events_deleted: totalEventsDeleted,
    failures: failureCount,
  });
}
