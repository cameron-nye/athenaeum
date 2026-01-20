import { describe, it, expect } from 'vitest';
import { calendar_v3 } from 'googleapis';
import { mapGoogleEventToDbEvent, categorizeGoogleApiError } from './calendar';

describe('google/calendar', () => {
  describe('mapGoogleEventToDbEvent', () => {
    const calendarSourceId = '550e8400-e29b-41d4-a716-446655440000';

    it('maps a basic timed event correctly', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event-123',
        summary: 'Team Meeting',
        description: 'Weekly sync',
        location: 'Conference Room A',
        start: { dateTime: '2026-01-20T10:00:00-05:00' },
        end: { dateTime: '2026-01-20T11:00:00-05:00' },
        status: 'confirmed',
      };

      const result = mapGoogleEventToDbEvent(googleEvent, calendarSourceId);

      expect(result).not.toBeNull();
      expect(result!.external_id).toBe('event-123');
      expect(result!.title).toBe('Team Meeting');
      expect(result!.description).toBe('Weekly sync');
      expect(result!.location).toBe('Conference Room A');
      expect(result!.all_day).toBe(false);
      expect(result!.calendar_source_id).toBe(calendarSourceId);
      // Should convert to UTC ISO string
      expect(result!.start_time).toBe('2026-01-20T15:00:00.000Z');
      expect(result!.end_time).toBe('2026-01-20T16:00:00.000Z');
    });

    it('maps an all-day event correctly', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event-456',
        summary: 'Company Holiday',
        start: { date: '2026-01-01' },
        end: { date: '2026-01-02' },
        status: 'confirmed',
      };

      const result = mapGoogleEventToDbEvent(googleEvent, calendarSourceId);

      expect(result).not.toBeNull();
      expect(result!.all_day).toBe(true);
      expect(result!.start_time).toBe('2026-01-01T00:00:00.000Z');
      expect(result!.end_time).toBe('2026-01-02T00:00:00.000Z');
    });

    it('handles event with no summary', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event-789',
        start: { dateTime: '2026-01-20T10:00:00Z' },
        end: { dateTime: '2026-01-20T11:00:00Z' },
        status: 'confirmed',
      };

      const result = mapGoogleEventToDbEvent(googleEvent, calendarSourceId);

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Untitled Event');
    });

    it('returns null for cancelled events', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event-cancelled',
        summary: 'Cancelled Meeting',
        start: { dateTime: '2026-01-20T10:00:00Z' },
        end: { dateTime: '2026-01-20T11:00:00Z' },
        status: 'cancelled',
      };

      const result = mapGoogleEventToDbEvent(googleEvent, calendarSourceId);

      expect(result).toBeNull();
    });

    it('returns null for event without id', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        summary: 'Event without ID',
        start: { dateTime: '2026-01-20T10:00:00Z' },
        end: { dateTime: '2026-01-20T11:00:00Z' },
      };

      const result = mapGoogleEventToDbEvent(googleEvent, calendarSourceId);

      expect(result).toBeNull();
    });

    it('returns null for timed event missing dateTime', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event-incomplete',
        summary: 'Incomplete Event',
        start: {},
        end: { dateTime: '2026-01-20T11:00:00Z' },
      };

      const result = mapGoogleEventToDbEvent(googleEvent, calendarSourceId);

      expect(result).toBeNull();
    });

    it('handles optional fields being null', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event-minimal',
        start: { dateTime: '2026-01-20T10:00:00Z' },
        end: { dateTime: '2026-01-20T11:00:00Z' },
        status: 'confirmed',
      };

      const result = mapGoogleEventToDbEvent(googleEvent, calendarSourceId);

      expect(result).not.toBeNull();
      expect(result!.description).toBeNull();
      expect(result!.location).toBeNull();
      expect(result!.recurrence_rule).toBeNull();
    });

    it('captures recurrence rule', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event-recurring',
        summary: 'Daily Standup',
        start: { dateTime: '2026-01-20T09:00:00Z' },
        end: { dateTime: '2026-01-20T09:15:00Z' },
        recurrence: ['RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR'],
        status: 'confirmed',
      };

      const result = mapGoogleEventToDbEvent(googleEvent, calendarSourceId);

      expect(result).not.toBeNull();
      expect(result!.recurrence_rule).toBe('RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR');
    });

    it('stores raw_data for debugging', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event-raw',
        summary: 'Test Event',
        start: { dateTime: '2026-01-20T10:00:00Z' },
        end: { dateTime: '2026-01-20T11:00:00Z' },
        status: 'confirmed',
        attendees: [{ email: 'test@example.com' }],
      };

      const result = mapGoogleEventToDbEvent(googleEvent, calendarSourceId);

      expect(result).not.toBeNull();
      expect(result!.raw_data).toEqual(googleEvent);
    });
  });

  describe('categorizeGoogleApiError', () => {
    it('returns unknown for non-Error objects', () => {
      const result = categorizeGoogleApiError('string error');
      expect(result.type).toBe('unknown');
      expect(result.retryable).toBe(false);
    });

    it('categorizes 401 as auth error', () => {
      const error = Object.assign(new Error('Unauthorized'), { code: 401 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('auth');
      expect(result.retryable).toBe(false);
    });

    it('categorizes 404 as not_found error', () => {
      const error = Object.assign(new Error('Not Found'), { code: 404 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('not_found');
      expect(result.retryable).toBe(false);
    });

    it('categorizes 429 as rate_limit error', () => {
      const error = Object.assign(new Error('Too Many Requests'), { code: 429 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('rate_limit');
      expect(result.retryable).toBe(true);
    });

    it('categorizes 403 with rate limit message as rate_limit error', () => {
      const error = Object.assign(new Error('Rate Limit Exceeded'), { code: 403 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('rate_limit');
      expect(result.retryable).toBe(true);
    });

    it('categorizes 403 with quota message as rate_limit error', () => {
      const error = Object.assign(new Error('Quota exceeded'), { code: 403 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('rate_limit');
      expect(result.retryable).toBe(true);
    });

    it('categorizes 403 without rate limit as auth error', () => {
      const error = Object.assign(new Error('Forbidden'), { code: 403 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('auth');
      expect(result.retryable).toBe(false);
    });

    it('categorizes 500 as server_error', () => {
      const error = Object.assign(new Error('Internal Server Error'), { code: 500 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('server_error');
      expect(result.retryable).toBe(true);
    });

    it('categorizes 502 as server_error', () => {
      const error = Object.assign(new Error('Bad Gateway'), { code: 502 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('server_error');
      expect(result.retryable).toBe(true);
    });

    it('categorizes 503 as server_error', () => {
      const error = Object.assign(new Error('Service Unavailable'), { code: 503 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('server_error');
      expect(result.retryable).toBe(true);
    });

    it('categorizes ENOTFOUND as network error', () => {
      const error = new Error('getaddrinfo ENOTFOUND www.googleapis.com');
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('network');
      expect(result.retryable).toBe(true);
    });

    it('categorizes ECONNREFUSED as network error', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:443');
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('network');
      expect(result.retryable).toBe(true);
    });

    it('categorizes ETIMEDOUT as network error', () => {
      const error = new Error('connect ETIMEDOUT 172.217.14.99:443');
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('network');
      expect(result.retryable).toBe(true);
    });

    it('returns unknown for unrecognized errors', () => {
      const error = new Error('Something went wrong');
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('unknown');
      expect(result.retryable).toBe(false);
      expect(result.message).toBe('Something went wrong');
    });

    it('uses status property when code is not a number', () => {
      const error = Object.assign(new Error('Not Found'), { status: 404 });
      const result = categorizeGoogleApiError(error);
      expect(result.type).toBe('not_found');
    });
  });
});
