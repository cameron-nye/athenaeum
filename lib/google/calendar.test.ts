import { describe, it, expect } from 'vitest';
import { calendar_v3 } from 'googleapis';
import { mapGoogleEventToDbEvent } from './calendar';

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
});
