/**
 * Event time formatting utilities for display
 * REQ-3-024: Create utility for formatting event times for display
 */

import { parseISO, formatTime, formatShortDate, isToday, getNow } from '@/lib/utils/dates';

export interface DisplayEvent {
  start_time: string;
  end_time: string;
  all_day: boolean;
}

export interface FormatOptions {
  use24Hour?: boolean;
  timezone?: string;
}

/**
 * Formats an event's time for display.
 * Handles all-day, multi-day, ongoing, and standard events.
 *
 * @param event - Event with start_time, end_time, all_day
 * @param options - Formatting options
 * @returns Human-readable time string
 */
export function formatEventTime(event: DisplayEvent, options: FormatOptions = {}): string {
  const { use24Hour = false, timezone } = options;

  if (event.all_day) {
    return 'All Day';
  }

  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);
  const now = getNow();

  // Check if event is currently happening
  if (now >= start && now < end) {
    return 'Now';
  }

  // Format time range
  const startTime = formatTime(start, use24Hour, timezone);
  const endTime = formatTime(end, use24Hour, timezone);

  return `${startTime} - ${endTime}`;
}

/**
 * Formats an event's time with date context for upcoming events sidebar.
 * Shows date for non-today events.
 *
 * @param event - Event with start_time, end_time, all_day
 * @param options - Formatting options
 * @returns Time string with date context
 */
export function formatEventTimeWithContext(
  event: DisplayEvent,
  options: FormatOptions = {}
): string {
  const { use24Hour = false, timezone } = options;
  const start = parseISO(event.start_time);

  if (event.all_day) {
    return 'All Day';
  }

  const startTime = formatTime(start, use24Hour, timezone);

  if (isToday(start, timezone)) {
    return startTime;
  }

  const date = formatShortDate(start, timezone);
  return `${date}, ${startTime}`;
}

/**
 * Determines if an event is currently happening.
 *
 * @param event - Event with start_time, end_time
 * @returns True if event is ongoing
 */
export function isEventOngoing(event: DisplayEvent): boolean {
  const now = getNow();
  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);

  return now >= start && now < end;
}

/**
 * Determines if an event is starting soon (within next 15 minutes).
 *
 * @param event - Event with start_time
 * @returns True if event starts within 15 minutes
 */
export function isEventStartingSoon(event: DisplayEvent): boolean {
  const now = getNow();
  const start = parseISO(event.start_time);
  const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

  return start > now && start <= fifteenMinutesFromNow;
}

/**
 * Gets the relative time until an event starts.
 *
 * @param event - Event with start_time
 * @returns Human-readable relative time (e.g., "in 30 min", "in 2 hours")
 */
export function getTimeUntilEvent(event: DisplayEvent): string | null {
  const now = getNow();
  const start = parseISO(event.start_time);
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) {
    return null; // Already started
  }

  const minutes = Math.round(diffMs / (1000 * 60));

  if (minutes < 60) {
    return `in ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  const days = Math.round(hours / 24);
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Formats a time for the clock display.
 *
 * @param date - Date to format
 * @param use24Hour - Use 24-hour format
 * @param timezone - IANA timezone
 * @returns Object with hours, minutes, period (for 12h format)
 */
export function formatClockTime(
  date: Date,
  use24Hour = false,
  timezone?: string
): { hours: string; minutes: string; period?: string } {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  };

  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);

  const hours = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minutes = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const period = use24Hour ? undefined : parts.find((p) => p.type === 'dayPeriod')?.value;

  return { hours, minutes, period };
}

/**
 * Groups events by date for the upcoming events sidebar.
 *
 * @param events - Array of events
 * @param timezone - IANA timezone
 * @returns Map of date strings to events
 */
export function groupEventsByDate<T extends DisplayEvent>(
  events: T[],
  timezone?: string
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const event of events) {
    const start = parseISO(event.start_time);
    const dateKey = formatShortDate(start, timezone);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(event);
  }

  return groups;
}

/**
 * Sorts events by start time, with all-day events first.
 *
 * @param events - Array of events
 * @returns Sorted array
 */
export function sortEventsByTime<T extends DisplayEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    // All-day events first
    if (a.all_day && !b.all_day) return -1;
    if (!a.all_day && b.all_day) return 1;

    // Then by start time
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });
}
