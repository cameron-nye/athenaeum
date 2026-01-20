/**
 * Server-side functions for fetching calendar events for view rendering.
 * REQ-2-020: Calendar view data fetching
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Calendar source info included with events for display.
 */
export interface CalendarSourceInfo {
  id: string;
  name: string;
  color: string | null;
  provider: 'google' | 'ical';
}

/**
 * Event data structure returned for calendar views.
 * Includes denormalized calendar source info for efficient rendering.
 */
export interface CalendarViewEvent {
  id: string;
  calendar_source_id: string;
  external_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  recurrence_rule: string | null;
  calendar_source: CalendarSourceInfo;
}

/**
 * Options for fetching calendar events.
 */
export interface FetchEventsOptions {
  /** Start of date range (inclusive) - ISO 8601 string */
  startDate: string;
  /** End of date range (inclusive) - ISO 8601 string */
  endDate: string;
  /** Optional: filter to specific calendar source IDs */
  calendarSourceIds?: string[];
}

/**
 * Result of fetching calendar events.
 */
export interface FetchEventsResult {
  events: CalendarViewEvent[];
  error: string | null;
}

/**
 * Fetches events for the current user's household within a date range.
 *
 * Events are filtered to only include those from enabled calendars
 * belonging to the user's household. Results are sorted by start_time.
 *
 * Uses RLS policies to ensure users can only see their household's events.
 *
 * @param supabase - Supabase client with user session
 * @param options - Fetch options including date range
 * @returns Events array sorted by start_time with calendar source info
 *
 * @example
 * ```ts
 * const { events, error } = await fetchEventsForDateRange(supabase, {
 *   startDate: '2024-01-01T00:00:00Z',
 *   endDate: '2024-01-31T23:59:59Z',
 * });
 * ```
 */
export async function fetchEventsForDateRange(
  supabase: SupabaseClient,
  options: FetchEventsOptions
): Promise<FetchEventsResult> {
  const { startDate, endDate, calendarSourceIds } = options;

  try {
    // Build query with calendar source join
    let query = supabase
      .from('events')
      .select(
        `
        id,
        calendar_source_id,
        external_id,
        title,
        description,
        location,
        start_time,
        end_time,
        all_day,
        recurrence_rule,
        calendar_sources!inner (
          id,
          name,
          color,
          provider,
          enabled
        )
      `
      )
      // Events that overlap with the date range:
      // Event starts before range ends AND event ends after range starts
      .lt('start_time', endDate)
      .gt('end_time', startDate)
      // Only enabled calendars
      .eq('calendar_sources.enabled', true)
      // Sort by start time for consistent ordering
      .order('start_time', { ascending: true });

    // Filter to specific calendar sources if provided
    if (calendarSourceIds && calendarSourceIds.length > 0) {
      query = query.in('calendar_source_id', calendarSourceIds);
    }

    const { data, error } = await query;

    if (error) {
      return {
        events: [],
        error: error.message,
      };
    }

    // Transform the nested response to flat structure
    const events: CalendarViewEvent[] = (data ?? []).map((row) => {
      const calendarSource = row.calendar_sources as unknown as {
        id: string;
        name: string;
        color: string | null;
        provider: 'google' | 'ical';
        enabled: boolean;
      };

      return {
        id: row.id,
        calendar_source_id: row.calendar_source_id,
        external_id: row.external_id,
        title: row.title,
        description: row.description,
        location: row.location,
        start_time: row.start_time,
        end_time: row.end_time,
        all_day: row.all_day,
        recurrence_rule: row.recurrence_rule,
        calendar_source: {
          id: calendarSource.id,
          name: calendarSource.name,
          color: calendarSource.color,
          provider: calendarSource.provider,
        },
      };
    });

    return {
      events,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching events';
    return {
      events: [],
      error: errorMessage,
    };
  }
}

/**
 * Fetches enabled calendar sources for the current user's household.
 *
 * Uses RLS policies to ensure users can only see their household's calendars.
 *
 * @param supabase - Supabase client with user session
 * @returns Array of calendar sources
 */
export async function fetchEnabledCalendarSources(
  supabase: SupabaseClient
): Promise<{ sources: CalendarSourceInfo[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('calendar_sources')
      .select('id, name, color, provider')
      .eq('enabled', true)
      .order('name', { ascending: true });

    if (error) {
      return {
        sources: [],
        error: error.message,
      };
    }

    const sources: CalendarSourceInfo[] = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      provider: row.provider as 'google' | 'ical',
    }));

    return {
      sources,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching calendars';
    return {
      sources: [],
      error: errorMessage,
    };
  }
}

/**
 * Fetches all calendar sources for the current user's household (including disabled).
 *
 * Uses RLS policies to ensure users can only see their household's calendars.
 *
 * @param supabase - Supabase client with user session
 * @returns Array of calendar sources with enabled status
 */
export async function fetchAllCalendarSources(
  supabase: SupabaseClient
): Promise<{
  sources: (CalendarSourceInfo & { enabled: boolean; last_synced_at: string | null })[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('calendar_sources')
      .select('id, name, color, provider, enabled, last_synced_at')
      .order('name', { ascending: true });

    if (error) {
      return {
        sources: [],
        error: error.message,
      };
    }

    const sources = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      provider: row.provider as 'google' | 'ical',
      enabled: row.enabled,
      last_synced_at: row.last_synced_at,
    }));

    return {
      sources,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching calendars';
    return {
      sources: [],
      error: errorMessage,
    };
  }
}
