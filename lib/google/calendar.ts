import { google, calendar_v3 } from 'googleapis';
import { Credentials } from 'google-auth-library';
import { SupabaseClient } from '@supabase/supabase-js';
import { getValidOAuth2Client, TokenRevocationError } from './auth';
import { encrypt, decrypt } from '../crypto';

/**
 * Event data mapped from Google Calendar event to our database schema
 */
export interface CalendarEvent {
  calendar_source_id: string;
  external_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  recurrence_rule: string | null;
  raw_data: calendar_v3.Schema$Event;
}

/**
 * Result of a calendar sync operation
 */
export interface SyncResult {
  success: boolean;
  eventsUpserted: number;
  eventsDeleted: number;
  newSyncToken: string | null;
  error?: string;
  /** True if the calendar was disconnected due to token revocation */
  disconnected?: boolean;
}

/**
 * Calendar source record from database
 */
interface CalendarSource {
  id: string;
  external_id: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  sync_token: string | null;
}

/**
 * Maps a Google Calendar event to our database schema.
 * Handles all-day events and time-based events differently.
 *
 * @param event - Google Calendar event object
 * @param calendarSourceId - UUID of the calendar_source record
 * @returns Mapped event data or null if event is invalid
 */
export function mapGoogleEventToDbEvent(
  event: calendar_v3.Schema$Event,
  calendarSourceId: string
): CalendarEvent | null {
  if (!event.id) {
    return null;
  }

  // Skip cancelled events in initial mapping (handled separately in sync)
  if (event.status === 'cancelled') {
    return null;
  }

  const isAllDay = !!(event.start?.date && !event.start?.dateTime);

  let startTime: string;
  let endTime: string;

  if (isAllDay) {
    // All-day events use date only (YYYY-MM-DD)
    // Store as midnight UTC on that date
    startTime = new Date(event.start!.date! + 'T00:00:00Z').toISOString();
    // End date is exclusive in Google, so we use it as-is
    endTime = new Date(event.end!.date! + 'T00:00:00Z').toISOString();
  } else {
    // Time-based events use dateTime with timezone
    if (!event.start?.dateTime || !event.end?.dateTime) {
      return null;
    }
    startTime = new Date(event.start.dateTime).toISOString();
    endTime = new Date(event.end.dateTime).toISOString();
  }

  return {
    calendar_source_id: calendarSourceId,
    external_id: event.id,
    title: event.summary ?? 'Untitled Event',
    description: event.description ?? null,
    location: event.location ?? null,
    start_time: startTime,
    end_time: endTime,
    all_day: isAllDay,
    recurrence_rule: event.recurrence?.[0] ?? null,
    raw_data: event,
  };
}

/**
 * Upserts events to the database.
 * Uses ON CONFLICT to update existing events or insert new ones.
 *
 * @param supabase - Supabase client
 * @param events - Array of events to upsert
 * @returns Number of events successfully upserted
 */
export async function upsertEvents(
  supabase: SupabaseClient,
  events: CalendarEvent[]
): Promise<number> {
  if (events.length === 0) {
    return 0;
  }

  const { error } = await supabase.from('events').upsert(events, {
    onConflict: 'calendar_source_id,external_id',
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Failed to upsert events: ${error.message}`);
  }

  return events.length;
}

/**
 * Deletes cancelled events from the database.
 *
 * @param supabase - Supabase client
 * @param calendarSourceId - UUID of the calendar_source record
 * @param externalIds - Array of event IDs to delete
 * @returns Number of events deleted
 */
export async function deleteEvents(
  supabase: SupabaseClient,
  calendarSourceId: string,
  externalIds: string[]
): Promise<number> {
  if (externalIds.length === 0) {
    return 0;
  }

  const { error, count } = await supabase
    .from('events')
    .delete()
    .eq('calendar_source_id', calendarSourceId)
    .in('external_id', externalIds);

  if (error) {
    throw new Error(`Failed to delete events: ${error.message}`);
  }

  return count ?? externalIds.length;
}

/**
 * Fetches events from Google Calendar API with pagination.
 * Uses singleEvents=true to expand recurring events.
 *
 * @param calendarApi - Google Calendar API client
 * @param calendarId - Google Calendar ID (external_id)
 * @param syncToken - Optional sync token for incremental sync
 * @param timeMin - Optional minimum time for full sync (defaults to 30 days ago)
 * @param timeMax - Optional maximum time for full sync (defaults to 90 days ahead)
 * @returns Object with events array and new sync token
 */
async function fetchGoogleEvents(
  calendarApi: calendar_v3.Calendar,
  calendarId: string,
  syncToken?: string | null,
  timeMin?: string,
  timeMax?: string
): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken: string | null }> {
  const allEvents: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  // Default time range for full sync: 30 days ago to 90 days ahead
  const now = new Date();
  const defaultTimeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const defaultTimeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  do {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      singleEvents: true, // Expand recurring events into individual instances
      orderBy: 'startTime',
      maxResults: 250, // API max is 250
      pageToken,
    };

    // Use sync token OR time range, not both
    if (syncToken) {
      params.syncToken = syncToken;
    } else {
      params.timeMin = timeMin ?? defaultTimeMin;
      params.timeMax = timeMax ?? defaultTimeMax;
    }

    const response = await calendarApi.events.list(params);

    if (response.data.items) {
      allEvents.push(...response.data.items);
    }

    pageToken = response.data.nextPageToken ?? undefined;
    nextSyncToken = response.data.nextSyncToken ?? null;
  } while (pageToken);

  return { events: allEvents, nextSyncToken };
}

/**
 * Gets decrypted OAuth tokens from a calendar source.
 *
 * @param source - Calendar source record
 * @returns OAuth2 Credentials object
 */
function getTokensFromSource(source: CalendarSource): Credentials {
  if (!source.refresh_token_encrypted) {
    throw new Error('Calendar source has no refresh token');
  }

  const refreshToken = decrypt(source.refresh_token_encrypted);
  const accessToken = source.access_token_encrypted ? decrypt(source.access_token_encrypted) : null;

  return {
    refresh_token: refreshToken,
    access_token: accessToken ?? undefined,
  };
}

/**
 * Updates the calendar source with new tokens after refresh.
 *
 * @param supabase - Supabase client
 * @param calendarSourceId - UUID of the calendar_source record
 * @param tokens - New OAuth2 credentials
 */
async function updateCalendarSourceTokens(
  supabase: SupabaseClient,
  calendarSourceId: string,
  tokens: Credentials
): Promise<void> {
  const updates: Record<string, string | null> = {};

  if (tokens.access_token) {
    updates.access_token_encrypted = encrypt(tokens.access_token);
  }
  if (tokens.refresh_token) {
    updates.refresh_token_encrypted = encrypt(tokens.refresh_token);
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('calendar_sources')
      .update(updates)
      .eq('id', calendarSourceId);

    if (error) {
      console.error('Failed to update calendar source tokens:', error);
    }
  }
}

/**
 * Marks a calendar source as disconnected due to token revocation.
 * Clears tokens and disables the calendar.
 *
 * @param supabase - Supabase client
 * @param calendarSourceId - UUID of the calendar_source record
 */
async function markCalendarDisconnected(
  supabase: SupabaseClient,
  calendarSourceId: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_sources')
    .update({
      enabled: false,
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      sync_token: null,
    })
    .eq('id', calendarSourceId);

  if (error) {
    console.error('Failed to mark calendar as disconnected:', error);
  } else {
    console.log(`Calendar ${calendarSourceId} marked as disconnected due to token revocation`);
  }
}

/**
 * Syncs events from a Google Calendar to the database.
 *
 * Uses incremental sync with syncToken when available.
 * Falls back to full sync on 410 error (expired sync token).
 * Handles pagination for large calendars.
 *
 * @param supabase - Supabase client
 * @param calendarSource - Calendar source record
 * @returns Sync result with counts and status
 */
export async function syncCalendarEvents(
  supabase: SupabaseClient,
  calendarSource: CalendarSource
): Promise<SyncResult> {
  try {
    const tokens = getTokensFromSource(calendarSource);

    // Get valid OAuth client with automatic token refresh
    const auth = await getValidOAuth2Client(tokens, async (newTokens) => {
      await updateCalendarSourceTokens(supabase, calendarSource.id, newTokens);
    });

    const calendarApi = google.calendar({ version: 'v3', auth });

    let events: calendar_v3.Schema$Event[];
    let nextSyncToken: string | null;

    try {
      // Try incremental sync with sync token
      const result = await fetchGoogleEvents(
        calendarApi,
        calendarSource.external_id,
        calendarSource.sync_token
      );
      events = result.events;
      nextSyncToken = result.nextSyncToken;
    } catch (error) {
      // Handle 410 Gone - sync token expired, do full sync
      if (error instanceof Error && 'code' in error && (error as { code?: number }).code === 410) {
        console.log(`Sync token expired for calendar ${calendarSource.id}, performing full sync`);
        const result = await fetchGoogleEvents(calendarApi, calendarSource.external_id, null);
        events = result.events;
        nextSyncToken = result.nextSyncToken;
      } else {
        throw error;
      }
    }

    // Separate events into upserts and deletes
    const eventsToUpsert: CalendarEvent[] = [];
    const eventIdsToDelete: string[] = [];

    for (const event of events) {
      if (event.status === 'cancelled' && event.id) {
        eventIdsToDelete.push(event.id);
      } else {
        const mappedEvent = mapGoogleEventToDbEvent(event, calendarSource.id);
        if (mappedEvent) {
          eventsToUpsert.push(mappedEvent);
        }
      }
    }

    // Perform database operations
    const eventsUpserted = await upsertEvents(supabase, eventsToUpsert);
    const eventsDeleted = await deleteEvents(supabase, calendarSource.id, eventIdsToDelete);

    // Update calendar source with new sync token and last_synced_at
    const { error: updateError } = await supabase
      .from('calendar_sources')
      .update({
        sync_token: nextSyncToken,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', calendarSource.id);

    if (updateError) {
      console.error('Failed to update sync token:', updateError);
    }

    return {
      success: true,
      eventsUpserted,
      eventsDeleted,
      newSyncToken: nextSyncToken,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Sync failed for calendar ${calendarSource.id}:`, errorMessage);

    // Check if this is a token revocation error
    if (error instanceof TokenRevocationError) {
      await markCalendarDisconnected(supabase, calendarSource.id);
      return {
        success: false,
        eventsUpserted: 0,
        eventsDeleted: 0,
        newSyncToken: null,
        error: 'Calendar disconnected: authentication expired. Please reconnect.',
        disconnected: true,
      };
    }

    return {
      success: false,
      eventsUpserted: 0,
      eventsDeleted: 0,
      newSyncToken: null,
      error: errorMessage,
    };
  }
}
