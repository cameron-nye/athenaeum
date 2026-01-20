/**
 * Google Calendar webhook receiver for push notifications.
 * REQ-2-027: Create Google Calendar webhook receiver
 *
 * Google sends POST requests to this endpoint when calendar events change.
 * The response must be returned quickly (200 OK) before processing completes.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { syncCalendarEvents } from '@/lib/google/calendar';

/**
 * Validates the webhook request headers from Google.
 *
 * @param headers - Request headers
 * @returns Object with validation result and resource ID
 */
function validateWebhookHeaders(headers: Headers): {
  isValid: boolean;
  resourceId: string | null;
  channelId: string | null;
  resourceState: string | null;
} {
  const resourceId = headers.get('X-Goog-Resource-ID');
  const channelId = headers.get('X-Goog-Channel-ID');
  const resourceState = headers.get('X-Goog-Resource-State');

  // Both resource ID and channel ID are required
  if (!resourceId || !channelId) {
    return { isValid: false, resourceId: null, channelId: null, resourceState: null };
  }

  return { isValid: true, resourceId, channelId, resourceState };
}

/**
 * POST /api/webhooks/google
 * Receives push notifications from Google Calendar.
 *
 * Google sends these headers:
 * - X-Goog-Channel-ID: Our channel UUID
 * - X-Goog-Resource-ID: Google's resource ID
 * - X-Goog-Resource-State: sync, exists, or not_exists
 * - X-Goog-Message-Number: Incrementing message number
 */
export async function POST(request: Request): Promise<Response> {
  const startTime = Date.now();

  // Validate headers
  const { isValid, resourceId, channelId, resourceState } = validateWebhookHeaders(request.headers);

  if (!isValid) {
    console.warn('Invalid webhook request: missing required headers');
    return NextResponse.json({ error: 'Invalid webhook headers' }, { status: 400 });
  }

  console.log(
    `Webhook received: channel=${channelId}, resource=${resourceId}, state=${resourceState}`
  );

  // For 'sync' state, Google is just verifying the endpoint works
  if (resourceState === 'sync') {
    console.log('Sync verification request, returning OK');
    return NextResponse.json({ received: true });
  }

  // Use admin client to bypass RLS
  const supabase = createAdminClient();

  // Look up the channel in the database
  const { data: channel, error: channelError } = await supabase
    .from('webhook_channels')
    .select('id, calendar_source_id')
    .eq('channel_id', channelId)
    .single();

  if (channelError || !channel) {
    console.warn(`Unknown webhook channel: ${channelId}`, channelError);
    // Return 200 OK anyway to prevent Google from retrying
    // The channel might have been deleted
    return NextResponse.json({ received: true, warning: 'Unknown channel' });
  }

  // Fetch the calendar source
  const { data: calendarSource, error: sourceError } = await supabase
    .from('calendar_sources')
    .select('id, external_id, access_token_encrypted, refresh_token_encrypted, sync_token')
    .eq('id', channel.calendar_source_id)
    .single();

  if (sourceError || !calendarSource) {
    console.warn(`Calendar source not found for channel: ${channelId}`, sourceError);
    return NextResponse.json({ received: true, warning: 'Calendar source not found' });
  }

  // Check if calendar source has valid tokens
  if (!calendarSource.refresh_token_encrypted) {
    console.warn(`Calendar source ${calendarSource.id} has no refresh token, skipping sync`);
    return NextResponse.json({ received: true, warning: 'Calendar disconnected' });
  }

  // Trigger sync in the background (don't await)
  // We need to return quickly to prevent Google from timing out
  const syncPromise = syncCalendarEvents(supabase, calendarSource)
    .then((result) => {
      const duration = Date.now() - startTime;
      console.log(
        `Webhook sync completed: calendar=${calendarSource.id}, ` +
          `upserted=${result.eventsUpserted}, deleted=${result.eventsDeleted}, ` +
          `duration=${duration}ms`
      );
    })
    .catch((error) => {
      console.error(`Webhook sync failed for calendar ${calendarSource.id}:`, error);
    });

  // Edge runtime doesn't have waitUntil, so we need to handle this differently
  // For Vercel, we can use the response promise to keep the function alive
  // For now, we'll just fire-and-forget and rely on cron for any missed syncs
  void syncPromise;

  return NextResponse.json({
    received: true,
    calendar_source_id: calendarSource.id,
  });
}
