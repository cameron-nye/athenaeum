/**
 * Cron job to renew expiring Google Calendar webhook channels.
 * REQ-2-030: Create webhook renewal cron job
 *
 * Runs daily to renew channels expiring within 24 hours.
 * This ensures continuous real-time updates from Google Calendar.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { registerWebhookChannel, stopWebhookChannel } from '@/lib/google/calendar';

/**
 * GET /api/cron/webhooks
 * Renews webhook channels that are expiring within 24 hours.
 *
 * Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request): Promise<Response> {
  // Validate cron secret
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    console.warn('Webhook renewal cron: unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find channels expiring within 24 hours
  const expirationThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: expiringChannels, error: fetchError } = await supabase
    .from('webhook_channels')
    .select(
      `
      id,
      channel_id,
      resource_id,
      calendar_source_id,
      calendar_sources!inner (
        id,
        external_id,
        access_token_encrypted,
        refresh_token_encrypted,
        sync_token,
        enabled
      )
    `
    )
    .lt('expiration', expirationThreshold);

  if (fetchError) {
    console.error('Failed to fetch expiring webhook channels:', fetchError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!expiringChannels || expiringChannels.length === 0) {
    console.log('No webhook channels need renewal');
    return NextResponse.json({
      renewed: 0,
      failed: 0,
      skipped: 0,
    });
  }

  console.log(`Found ${expiringChannels.length} webhook channels to renew`);

  // Build webhook URL from environment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (!baseUrl) {
    console.error('No base URL configured for webhooks');
    return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
  }

  const webhookUrl = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/webhooks/google`;

  let renewed = 0;
  let failed = 0;
  let skipped = 0;

  // Process each expiring channel
  for (const channel of expiringChannels) {
    const calendarSource = Array.isArray(channel.calendar_sources)
      ? channel.calendar_sources[0]
      : channel.calendar_sources;

    // Skip disabled calendars or those without tokens
    if (!calendarSource?.enabled || !calendarSource?.refresh_token_encrypted) {
      console.log(`Skipping disabled/disconnected calendar: ${channel.calendar_source_id}`);
      // Delete the old channel since the calendar is not active
      await supabase.from('webhook_channels').delete().eq('id', channel.id);
      skipped++;
      continue;
    }

    // Stop the old channel first
    await stopWebhookChannel(supabase, calendarSource, channel.channel_id, channel.resource_id);

    // Register a new channel
    const result = await registerWebhookChannel(supabase, calendarSource, webhookUrl);

    if (result.success) {
      renewed++;
      console.log(`Renewed webhook for calendar ${calendarSource.id}: ${result.channelId}`);
    } else {
      failed++;
      console.error(`Failed to renew webhook for calendar ${calendarSource.id}: ${result.error}`);
    }
  }

  console.log(`Webhook renewal complete: renewed=${renewed}, failed=${failed}, skipped=${skipped}`);

  return NextResponse.json({
    renewed,
    failed,
    skipped,
  });
}
