import { NextRequest, NextResponse } from 'next/server';
import { createDisplayServerClient } from '@/lib/supabase/display-server';
import { google } from 'googleapis';
import { getValidOAuth2Client } from '@/lib/google/auth';
import { decrypt, encrypt } from '@/lib/crypto';

/**
 * GET /api/display/events
 *
 * Fetches calendar events for the display's household.
 * Query params:
 *   - from: start date (ISO 8601)
 *   - to: end date (ISO 8601)
 */
export async function GET(request: NextRequest) {
  const supabase = await createDisplayServerClient();
  const { searchParams } = new URL(request.url);

  try {
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    let query = supabase.from('events').select(
      `
        id,
        calendar_source_id,
        title,
        description,
        location,
        start_time,
        end_time,
        all_day,
        recurrence_rule,
        calendar_sources:calendar_source_id (
          id,
          name,
          color,
          enabled
        )
      `
    );

    // Filter by date range
    if (fromDate) {
      query = query.gte('start_time', fromDate);
    }
    if (toDate) {
      query = query.lte('start_time', toDate);
    }

    // Only show enabled calendars
    query = query.eq('calendar_sources.enabled', true);
    query = query.order('start_time', { ascending: true });

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching events for display:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events: events ?? [] });
  } catch (err) {
    console.error('Error in GET /api/display/events:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/display/events
 *
 * Creates a new event via Google Calendar API.
 * Uses the first connected calendar in the household.
 * Body: { title, start_time, end_time, all_day?, location?, description?, calendar_source_id? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createDisplayServerClient();

  try {
    // Verify display can write
    const { data: householdCheck, error: checkError } = await supabase.rpc(
      'get_display_household_id_for_write'
    );

    if (checkError || !householdCheck) {
      return NextResponse.json(
        { error: 'Display not authorized for write operations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, start_time, end_time, all_day, location, description, calendar_source_id } =
      body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'start_time and end_time are required' }, { status: 400 });
    }

    // Get the calendar source to use
    let calendarQuery = supabase
      .from('calendar_sources')
      .select('id, external_id, access_token_encrypted, refresh_token_encrypted')
      .eq('enabled', true)
      .not('refresh_token_encrypted', 'is', null);

    if (calendar_source_id) {
      calendarQuery = calendarQuery.eq('id', calendar_source_id);
    }

    const { data: calendarSources, error: calendarError } = await calendarQuery.limit(1);

    if (calendarError || !calendarSources || calendarSources.length === 0) {
      return NextResponse.json(
        { error: 'No writable calendar available. Connect a Google Calendar first.' },
        { status: 400 }
      );
    }

    const calendarSource = calendarSources[0];

    // Get OAuth tokens
    const refreshToken = decrypt(calendarSource.refresh_token_encrypted!);
    const accessToken = calendarSource.access_token_encrypted
      ? decrypt(calendarSource.access_token_encrypted)
      : null;

    const auth = await getValidOAuth2Client(
      {
        refresh_token: refreshToken,
        access_token: accessToken ?? undefined,
      },
      async (newTokens) => {
        // Update tokens in database
        const updates: Record<string, string | null> = {};
        if (newTokens.access_token) {
          updates.access_token_encrypted = encrypt(newTokens.access_token);
        }
        if (newTokens.refresh_token) {
          updates.refresh_token_encrypted = encrypt(newTokens.refresh_token);
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('calendar_sources').update(updates).eq('id', calendarSource.id);
        }
      }
    );

    const calendarApi = google.calendar({ version: 'v3', auth });

    // Create the event
    const isAllDay = all_day ?? false;
    const eventBody = isAllDay
      ? {
          summary: title.trim(),
          description: description?.trim() || undefined,
          location: location?.trim() || undefined,
          start: { date: start_time.split('T')[0] },
          end: { date: end_time.split('T')[0] },
        }
      : {
          summary: title.trim(),
          description: description?.trim() || undefined,
          location: location?.trim() || undefined,
          start: { dateTime: start_time },
          end: { dateTime: end_time },
        };

    const response = await calendarApi.events.insert({
      calendarId: calendarSource.external_id,
      requestBody: eventBody,
    });

    // Also insert into local database for immediate display
    const localEvent = {
      calendar_source_id: calendarSource.id,
      external_id: response.data.id,
      title: title.trim(),
      description: description?.trim() || null,
      location: location?.trim() || null,
      start_time: isAllDay
        ? new Date(start_time.split('T')[0] + 'T00:00:00Z').toISOString()
        : new Date(start_time).toISOString(),
      end_time: isAllDay
        ? new Date(end_time.split('T')[0] + 'T00:00:00Z').toISOString()
        : new Date(end_time).toISOString(),
      all_day: isAllDay,
      recurrence_rule: null,
      raw_data: response.data,
    };

    const { data: event, error: insertError } = await supabase
      .from('events')
      .insert(localEvent)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting local event:', insertError);
      // Event was created in Google, so return success but note the local issue
    }

    return NextResponse.json(
      {
        event: event || localEvent,
        google_event_id: response.data.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error in POST /api/display/events:', err);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
