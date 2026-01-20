import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  formatEventTime,
  formatEventTimeWithContext,
  isEventOngoing,
  isEventStartingSoon,
  getTimeUntilEvent,
  formatClockTime,
  groupEventsByDate,
  sortEventsByTime,
} from './time-formatting';

describe('formatEventTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "All Day" for all-day events', () => {
    const event = {
      start_time: '2026-01-20T00:00:00Z',
      end_time: '2026-01-21T00:00:00Z',
      all_day: true,
    };
    expect(formatEventTime(event)).toBe('All Day');
  });

  it('returns "Now" for ongoing events', () => {
    const event = {
      start_time: '2026-01-20T09:00:00Z',
      end_time: '2026-01-20T11:00:00Z',
      all_day: false,
    };
    expect(formatEventTime(event)).toBe('Now');
  });

  it('returns time range for future events', () => {
    const event = {
      start_time: '2026-01-20T14:00:00Z',
      end_time: '2026-01-20T15:00:00Z',
      all_day: false,
    };
    const result = formatEventTime(event);
    expect(result).toContain('-');
  });

  it('returns time range for past events', () => {
    const event = {
      start_time: '2026-01-20T08:00:00Z',
      end_time: '2026-01-20T09:00:00Z',
      all_day: false,
    };
    const result = formatEventTime(event);
    expect(result).toContain('-');
  });
});

describe('formatEventTimeWithContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "All Day" for all-day events', () => {
    const event = {
      start_time: '2026-01-20T00:00:00Z',
      end_time: '2026-01-21T00:00:00Z',
      all_day: true,
    };
    expect(formatEventTimeWithContext(event)).toBe('All Day');
  });

  it('returns just time for today events', () => {
    const event = {
      start_time: '2026-01-20T14:00:00Z',
      end_time: '2026-01-20T15:00:00Z',
      all_day: false,
    };
    const result = formatEventTimeWithContext(event);
    // Should not contain "Jan" since it's today
    expect(result).not.toMatch(/Jan \d+,/);
  });

  it('includes date for non-today events', () => {
    const event = {
      start_time: '2026-01-22T14:00:00Z',
      end_time: '2026-01-22T15:00:00Z',
      all_day: false,
    };
    const result = formatEventTimeWithContext(event);
    expect(result).toMatch(/Jan \d+,/);
  });
});

describe('isEventOngoing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for ongoing events', () => {
    const event = {
      start_time: '2026-01-20T09:00:00Z',
      end_time: '2026-01-20T11:00:00Z',
      all_day: false,
    };
    expect(isEventOngoing(event)).toBe(true);
  });

  it('returns false for future events', () => {
    const event = {
      start_time: '2026-01-20T11:00:00Z',
      end_time: '2026-01-20T12:00:00Z',
      all_day: false,
    };
    expect(isEventOngoing(event)).toBe(false);
  });

  it('returns false for past events', () => {
    const event = {
      start_time: '2026-01-20T08:00:00Z',
      end_time: '2026-01-20T09:00:00Z',
      all_day: false,
    };
    expect(isEventOngoing(event)).toBe(false);
  });
});

describe('isEventStartingSoon', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for events starting within 15 minutes', () => {
    const event = {
      start_time: '2026-01-20T10:10:00Z',
      end_time: '2026-01-20T11:00:00Z',
      all_day: false,
    };
    expect(isEventStartingSoon(event)).toBe(true);
  });

  it('returns false for events starting later', () => {
    const event = {
      start_time: '2026-01-20T11:00:00Z',
      end_time: '2026-01-20T12:00:00Z',
      all_day: false,
    };
    expect(isEventStartingSoon(event)).toBe(false);
  });

  it('returns false for past events', () => {
    const event = {
      start_time: '2026-01-20T09:00:00Z',
      end_time: '2026-01-20T09:30:00Z',
      all_day: false,
    };
    expect(isEventStartingSoon(event)).toBe(false);
  });
});

describe('getTimeUntilEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for past events', () => {
    const event = {
      start_time: '2026-01-20T09:00:00Z',
      end_time: '2026-01-20T09:30:00Z',
      all_day: false,
    };
    expect(getTimeUntilEvent(event)).toBeNull();
  });

  it('returns minutes for events starting soon', () => {
    const event = {
      start_time: '2026-01-20T10:30:00Z',
      end_time: '2026-01-20T11:00:00Z',
      all_day: false,
    };
    expect(getTimeUntilEvent(event)).toBe('in 30 min');
  });

  it('returns hours for events starting later', () => {
    const event = {
      start_time: '2026-01-20T12:00:00Z',
      end_time: '2026-01-20T13:00:00Z',
      all_day: false,
    };
    expect(getTimeUntilEvent(event)).toBe('in 2 hours');
  });

  it('returns days for events starting tomorrow or later', () => {
    const event = {
      start_time: '2026-01-22T10:00:00Z',
      end_time: '2026-01-22T11:00:00Z',
      all_day: false,
    };
    expect(getTimeUntilEvent(event)).toBe('in 2 days');
  });
});

describe('formatClockTime', () => {
  it('returns 12-hour format by default', () => {
    const date = new Date('2026-01-20T14:30:00Z');
    const result = formatClockTime(date, false, 'UTC');
    expect(result.hours).toBe('02');
    expect(result.minutes).toBe('30');
    expect(result.period).toBe('PM');
  });

  it('returns 24-hour format when specified', () => {
    const date = new Date('2026-01-20T14:30:00Z');
    const result = formatClockTime(date, true, 'UTC');
    expect(result.hours).toBe('14');
    expect(result.minutes).toBe('30');
    expect(result.period).toBeUndefined();
  });
});

describe('groupEventsByDate', () => {
  it('groups events by date', () => {
    const events = [
      { start_time: '2026-01-20T09:00:00Z', end_time: '2026-01-20T10:00:00Z', all_day: false },
      { start_time: '2026-01-20T14:00:00Z', end_time: '2026-01-20T15:00:00Z', all_day: false },
      { start_time: '2026-01-21T09:00:00Z', end_time: '2026-01-21T10:00:00Z', all_day: false },
    ];

    const groups = groupEventsByDate(events, 'UTC');
    expect(groups.size).toBe(2);
    expect(groups.get('Jan 20')?.length).toBe(2);
    expect(groups.get('Jan 21')?.length).toBe(1);
  });
});

describe('sortEventsByTime', () => {
  it('sorts all-day events first', () => {
    const events = [
      { start_time: '2026-01-20T09:00:00Z', end_time: '2026-01-20T10:00:00Z', all_day: false },
      { start_time: '2026-01-20T00:00:00Z', end_time: '2026-01-21T00:00:00Z', all_day: true },
    ];

    const sorted = sortEventsByTime(events);
    expect(sorted[0].all_day).toBe(true);
    expect(sorted[1].all_day).toBe(false);
  });

  it('sorts by start time', () => {
    const events = [
      { start_time: '2026-01-20T14:00:00Z', end_time: '2026-01-20T15:00:00Z', all_day: false },
      { start_time: '2026-01-20T09:00:00Z', end_time: '2026-01-20T10:00:00Z', all_day: false },
    ];

    const sorted = sortEventsByTime(events);
    expect(sorted[0].start_time).toBe('2026-01-20T09:00:00Z');
    expect(sorted[1].start_time).toBe('2026-01-20T14:00:00Z');
  });
});
