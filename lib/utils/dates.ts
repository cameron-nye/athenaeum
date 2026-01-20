/**
 * Date utility functions for calendar views.
 * All functions work with UTC dates to ensure consistency.
 * Display functions accept optional timezone for localized output.
 */

/**
 * Gets the start of the week (Sunday) for a given date.
 * Returns midnight UTC on that Sunday.
 *
 * @param date - Reference date
 * @returns Date object for start of week (Sunday 00:00:00 UTC)
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the end of the week (Saturday) for a given date.
 * Returns 23:59:59.999 UTC on that Saturday.
 *
 * @param date - Reference date
 * @returns Date object for end of week (Saturday 23:59:59.999 UTC)
 */
export function getEndOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const daysUntilSaturday = 6 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilSaturday);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Gets the start of the month for a given date.
 * Returns midnight UTC on the 1st.
 *
 * @param date - Reference date
 * @returns Date object for start of month (1st 00:00:00 UTC)
 */
export function getStartOfMonth(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return d;
}

/**
 * Gets the end of the month for a given date.
 * Returns 23:59:59.999 UTC on the last day.
 *
 * @param date - Reference date
 * @returns Date object for end of month (last day 23:59:59.999 UTC)
 */
export function getEndOfMonth(date: Date): Date {
  // Day 0 of next month = last day of current month
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return d;
}

/**
 * Gets the start of the day for a given date.
 * Returns midnight UTC.
 *
 * @param date - Reference date
 * @returns Date object for start of day (00:00:00 UTC)
 */
export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the end of the day for a given date.
 * Returns 23:59:59.999 UTC.
 *
 * @param date - Reference date
 * @returns Date object for end of day (23:59:59.999 UTC)
 */
export function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Checks if a date is today (in the specified timezone or local timezone).
 *
 * @param date - Date to check
 * @param timezone - IANA timezone (e.g., 'America/New_York'). Defaults to local timezone.
 * @returns True if date is today in the specified timezone
 */
export function isToday(date: Date, timezone?: string): boolean {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD format
  const dateStr = formatter.format(date);
  const todayStr = formatter.format(new Date());

  return dateStr === todayStr;
}

/**
 * Checks if two dates are the same day (in UTC).
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are on the same UTC day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Checks if two dates are in the same month (in UTC).
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are in the same UTC month
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() && date1.getUTCMonth() === date2.getUTCMonth()
  );
}

/**
 * Calculates the duration between two dates in minutes.
 *
 * @param start - Start date
 * @param end - End date
 * @returns Duration in minutes (can be negative if end is before start)
 */
export function getEventDurationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Calculates the duration between two dates in hours.
 *
 * @param start - Start date
 * @param end - End date
 * @returns Duration in hours (can be negative if end is before start)
 */
export function getEventDurationHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Formats a date for display in the user's timezone.
 *
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @param timezone - IANA timezone. Defaults to local timezone.
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  timezone?: string
): string {
  const formatOptions: Intl.DateTimeFormatOptions = {
    ...options,
    timeZone: timezone,
  };
  return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
}

/**
 * Formats a date as a full date string (e.g., "Monday, January 15, 2024").
 *
 * @param date - Date to format
 * @param timezone - IANA timezone. Defaults to local timezone.
 * @returns Formatted date string
 */
export function formatFullDate(date: Date, timezone?: string): string {
  return formatDate(
    date,
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    timezone
  );
}

/**
 * Formats a date as a short date string (e.g., "Jan 15").
 *
 * @param date - Date to format
 * @param timezone - IANA timezone. Defaults to local timezone.
 * @returns Formatted date string
 */
export function formatShortDate(date: Date, timezone?: string): string {
  return formatDate(
    date,
    {
      month: 'short',
      day: 'numeric',
    },
    timezone
  );
}

/**
 * Formats a time (e.g., "9:00 AM" or "14:30").
 *
 * @param date - Date to format
 * @param use24Hour - Whether to use 24-hour format
 * @param timezone - IANA timezone. Defaults to local timezone.
 * @returns Formatted time string
 */
export function formatTime(date: Date, use24Hour = false, timezone?: string): string {
  return formatDate(
    date,
    {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24Hour,
    },
    timezone
  );
}

/**
 * Formats a date and time (e.g., "Jan 15, 9:00 AM").
 *
 * @param date - Date to format
 * @param timezone - IANA timezone. Defaults to local timezone.
 * @returns Formatted date-time string
 */
export function formatDateTime(date: Date, timezone?: string): string {
  return formatDate(
    date,
    {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    },
    timezone
  );
}

/**
 * Formats a month and year (e.g., "January 2024").
 *
 * @param date - Date to format
 * @param timezone - IANA timezone. Defaults to local timezone.
 * @returns Formatted month-year string
 */
export function formatMonthYear(date: Date, timezone?: string): string {
  return formatDate(
    date,
    {
      month: 'long',
      year: 'numeric',
    },
    timezone
  );
}

/**
 * Formats a day of week (e.g., "Monday" or "Mon").
 *
 * @param date - Date to format
 * @param format - 'long' for full name, 'short' for abbreviated
 * @param timezone - IANA timezone. Defaults to local timezone.
 * @returns Formatted day name
 */
export function formatDayOfWeek(
  date: Date,
  format: 'long' | 'short' = 'long',
  timezone?: string
): string {
  return formatDate(date, { weekday: format }, timezone);
}

/**
 * Adds days to a date.
 *
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Adds weeks to a date.
 *
 * @param date - Starting date
 * @param weeks - Number of weeks to add (can be negative)
 * @returns New Date object
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Adds months to a date.
 *
 * @param date - Starting date
 * @param months - Number of months to add (can be negative)
 * @returns New Date object
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * Gets the number of days in a month.
 *
 * @param date - Date in the month to check
 * @returns Number of days in that month
 */
export function getDaysInMonth(date: Date): number {
  // Day 0 of next month = last day of current month
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

/**
 * Generates an array of dates for a month calendar grid.
 * Includes days from previous/next months to fill the grid.
 *
 * @param date - Any date in the target month
 * @returns Array of 42 dates (6 weeks)
 */
export function getMonthCalendarDates(date: Date): Date[] {
  const startOfMonth = getStartOfMonth(date);
  const firstDayOfWeek = startOfMonth.getUTCDay(); // 0 = Sunday
  const startDate = addDays(startOfMonth, -firstDayOfWeek);

  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    // 6 weeks * 7 days
    dates.push(addDays(startDate, i));
  }

  return dates;
}

/**
 * Generates an array of dates for a week.
 *
 * @param date - Any date in the target week
 * @returns Array of 7 dates (Sunday through Saturday)
 */
export function getWeekDates(date: Date): Date[] {
  const startOfWeek = getStartOfWeek(date);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(startOfWeek, i));
  }
  return dates;
}

/**
 * Generates an array of hour markers for a day view (0-23).
 *
 * @returns Array of hour numbers from 0 to 23
 */
export function getDayHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

/**
 * Formats an event duration in a human-readable format.
 *
 * @param start - Event start time
 * @param end - Event end time
 * @returns Formatted duration string (e.g., "2 hours 30 minutes")
 */
export function formatEventDuration(start: Date, end: Date): string {
  const minutes = getEventDurationMinutes(start, end);

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Parses an ISO date string to a Date object.
 * Ensures consistent parsing regardless of environment.
 *
 * @param isoString - ISO 8601 date string
 * @returns Date object
 */
export function parseISO(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Gets the current date/time.
 * Date objects represent a specific instant in time (UTC internally).
 * Use formatDate with a timezone for localized display.
 *
 * @returns Date object representing "now"
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Checks if an event spans multiple days.
 *
 * @param start - Event start time
 * @param end - Event end time
 * @returns True if event spans more than one calendar day (in UTC)
 */
export function isMultiDayEvent(start: Date, end: Date): boolean {
  return !isSameDay(start, end);
}

/**
 * Checks if a date falls within a range (inclusive).
 *
 * @param date - Date to check
 * @param rangeStart - Start of range
 * @param rangeEnd - End of range
 * @returns True if date is within range
 */
export function isWithinRange(date: Date, rangeStart: Date, rangeEnd: Date): boolean {
  const time = date.getTime();
  return time >= rangeStart.getTime() && time <= rangeEnd.getTime();
}

/**
 * Checks if two date ranges overlap.
 *
 * @param start1 - Start of first range
 * @param end1 - End of first range
 * @param start2 - Start of second range
 * @param end2 - End of second range
 * @returns True if ranges overlap
 */
export function doRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1.getTime() < end2.getTime() && end1.getTime() > start2.getTime();
}
