import { describe, it, expect } from 'vitest';
import {
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfDay,
  getEndOfDay,
  isToday,
  isSameDay,
  isSameMonth,
  getEventDurationMinutes,
  getEventDurationHours,
  formatTime,
  formatShortDate,
  formatMonthYear,
  formatDayOfWeek,
  formatEventDuration,
  addDays,
  addWeeks,
  addMonths,
  getDaysInMonth,
  getMonthCalendarDates,
  getWeekDates,
  getDayHours,
  parseISO,
  isMultiDayEvent,
  isWithinRange,
  doRangesOverlap,
} from './dates';

describe('getStartOfWeek', () => {
  it('returns Sunday for a Wednesday', () => {
    // Jan 15, 2025 is a Wednesday
    const wed = new Date(Date.UTC(2025, 0, 15, 12, 30, 0));
    const result = getStartOfWeek(wed);
    expect(result.getUTCDay()).toBe(0); // Sunday
    expect(result.getUTCDate()).toBe(12);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('returns same day for a Sunday', () => {
    const sun = new Date(Date.UTC(2025, 0, 12, 15, 0, 0));
    const result = getStartOfWeek(sun);
    expect(result.getUTCDate()).toBe(12);
    expect(result.getUTCHours()).toBe(0);
  });
});

describe('getEndOfWeek', () => {
  it('returns Saturday for a Wednesday', () => {
    const wed = new Date(Date.UTC(2025, 0, 15, 12, 30, 0));
    const result = getEndOfWeek(wed);
    expect(result.getUTCDay()).toBe(6); // Saturday
    expect(result.getUTCDate()).toBe(18);
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(59);
  });

  it('returns same day for a Saturday', () => {
    const sat = new Date(Date.UTC(2025, 0, 18, 10, 0, 0));
    const result = getEndOfWeek(sat);
    expect(result.getUTCDate()).toBe(18);
    expect(result.getUTCHours()).toBe(23);
  });
});

describe('getStartOfMonth', () => {
  it('returns first day of month', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = getStartOfMonth(date);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCHours()).toBe(0);
  });
});

describe('getEndOfMonth', () => {
  it('returns last day of January', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = getEndOfMonth(date);
    expect(result.getUTCDate()).toBe(31);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(59);
  });

  it('handles February in leap year', () => {
    const date = new Date(Date.UTC(2024, 1, 15)); // Feb 2024 - leap year
    const result = getEndOfMonth(date);
    expect(result.getUTCDate()).toBe(29);
  });

  it('handles February in non-leap year', () => {
    const date = new Date(Date.UTC(2025, 1, 15)); // Feb 2025 - non-leap
    const result = getEndOfMonth(date);
    expect(result.getUTCDate()).toBe(28);
  });
});

describe('getStartOfDay', () => {
  it('returns midnight', () => {
    const date = new Date(Date.UTC(2025, 0, 15, 14, 30, 45));
    const result = getStartOfDay(date);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });
});

describe('getEndOfDay', () => {
  it('returns end of day', () => {
    const date = new Date(Date.UTC(2025, 0, 15, 10, 0, 0));
    const result = getEndOfDay(date);
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(59);
    expect(result.getUTCSeconds()).toBe(59);
  });
});

describe('isToday', () => {
  it('returns true for today', () => {
    const now = new Date();
    expect(isToday(now)).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });
});

describe('isSameDay', () => {
  it('returns true for same day different times', () => {
    const date1 = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const date2 = new Date(Date.UTC(2025, 0, 15, 18, 30, 0));
    expect(isSameDay(date1, date2)).toBe(true);
  });

  it('returns false for different days', () => {
    const date1 = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const date2 = new Date(Date.UTC(2025, 0, 16, 9, 0, 0));
    expect(isSameDay(date1, date2)).toBe(false);
  });
});

describe('isSameMonth', () => {
  it('returns true for same month', () => {
    const date1 = new Date(Date.UTC(2025, 0, 1));
    const date2 = new Date(Date.UTC(2025, 0, 31));
    expect(isSameMonth(date1, date2)).toBe(true);
  });

  it('returns false for different months', () => {
    const date1 = new Date(Date.UTC(2025, 0, 31));
    const date2 = new Date(Date.UTC(2025, 1, 1));
    expect(isSameMonth(date1, date2)).toBe(false);
  });
});

describe('getEventDurationMinutes', () => {
  it('calculates minutes correctly', () => {
    const start = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const end = new Date(Date.UTC(2025, 0, 15, 10, 30, 0));
    expect(getEventDurationMinutes(start, end)).toBe(90);
  });
});

describe('getEventDurationHours', () => {
  it('calculates hours correctly', () => {
    const start = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const end = new Date(Date.UTC(2025, 0, 15, 11, 0, 0));
    expect(getEventDurationHours(start, end)).toBe(2);
  });
});

describe('formatTime', () => {
  it('formats in 12-hour by default', () => {
    const date = new Date(Date.UTC(2025, 0, 15, 14, 30, 0));
    const result = formatTime(date, false, 'UTC');
    expect(result).toMatch(/2:30\s*PM/i);
  });

  it('formats in 24-hour when requested', () => {
    const date = new Date(Date.UTC(2025, 0, 15, 14, 30, 0));
    const result = formatTime(date, true, 'UTC');
    expect(result).toBe('14:30');
  });
});

describe('formatShortDate', () => {
  it('formats as month and day', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = formatShortDate(date, 'UTC');
    expect(result).toBe('Jan 15');
  });
});

describe('formatMonthYear', () => {
  it('formats as month and year', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = formatMonthYear(date, 'UTC');
    expect(result).toBe('January 2025');
  });
});

describe('formatDayOfWeek', () => {
  it('formats long day name', () => {
    // Jan 15, 2025 is a Wednesday
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = formatDayOfWeek(date, 'long', 'UTC');
    expect(result).toBe('Wednesday');
  });

  it('formats short day name', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = formatDayOfWeek(date, 'short', 'UTC');
    expect(result).toBe('Wed');
  });
});

describe('formatEventDuration', () => {
  it('formats minutes only', () => {
    const start = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const end = new Date(Date.UTC(2025, 0, 15, 9, 30, 0));
    expect(formatEventDuration(start, end)).toBe('30 minutes');
  });

  it('formats hours only', () => {
    const start = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const end = new Date(Date.UTC(2025, 0, 15, 11, 0, 0));
    expect(formatEventDuration(start, end)).toBe('2 hours');
  });

  it('formats hours and minutes', () => {
    const start = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const end = new Date(Date.UTC(2025, 0, 15, 11, 30, 0));
    expect(formatEventDuration(start, end)).toBe('2 hours 30 minutes');
  });

  it('handles singular forms', () => {
    const start = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const end = new Date(Date.UTC(2025, 0, 15, 10, 1, 0));
    expect(formatEventDuration(start, end)).toBe('1 hour 1 minute');
  });
});

describe('addDays', () => {
  it('adds days correctly', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = addDays(date, 5);
    expect(result.getUTCDate()).toBe(20);
  });

  it('handles month rollover', () => {
    const date = new Date(Date.UTC(2025, 0, 30));
    const result = addDays(date, 5);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(4);
  });

  it('subtracts when negative', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = addDays(date, -5);
    expect(result.getUTCDate()).toBe(10);
  });
});

describe('addWeeks', () => {
  it('adds weeks correctly', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = addWeeks(date, 2);
    expect(result.getUTCDate()).toBe(29);
  });
});

describe('addMonths', () => {
  it('adds months correctly', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = addMonths(date, 3);
    expect(result.getUTCMonth()).toBe(3); // April
  });

  it('handles year rollover', () => {
    const date = new Date(Date.UTC(2025, 10, 15)); // November
    const result = addMonths(date, 3);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(1); // February
  });
});

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    const date = new Date(Date.UTC(2025, 0, 1));
    expect(getDaysInMonth(date)).toBe(31);
  });

  it('returns 28 for non-leap February', () => {
    const date = new Date(Date.UTC(2025, 1, 1));
    expect(getDaysInMonth(date)).toBe(28);
  });

  it('returns 29 for leap February', () => {
    const date = new Date(Date.UTC(2024, 1, 1));
    expect(getDaysInMonth(date)).toBe(29);
  });
});

describe('getMonthCalendarDates', () => {
  it('returns 42 dates', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = getMonthCalendarDates(date);
    expect(result).toHaveLength(42);
  });

  it('starts from Sunday of first week', () => {
    // January 2025 starts on Wednesday
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = getMonthCalendarDates(date);
    expect(result[0].getUTCDay()).toBe(0); // Sunday
    expect(result[0].getUTCMonth()).toBe(11); // December (prev month)
    expect(result[0].getUTCDate()).toBe(29); // Dec 29, 2024
  });
});

describe('getWeekDates', () => {
  it('returns 7 dates', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = getWeekDates(date);
    expect(result).toHaveLength(7);
  });

  it('starts with Sunday', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = getWeekDates(date);
    expect(result[0].getUTCDay()).toBe(0); // Sunday
  });

  it('ends with Saturday', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const result = getWeekDates(date);
    expect(result[6].getUTCDay()).toBe(6); // Saturday
  });
});

describe('getDayHours', () => {
  it('returns 24 hours', () => {
    const result = getDayHours();
    expect(result).toHaveLength(24);
    expect(result[0]).toBe(0);
    expect(result[23]).toBe(23);
  });
});

describe('parseISO', () => {
  it('parses ISO string correctly', () => {
    const result = parseISO('2025-01-15T09:30:00.000Z');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(30);
  });
});

describe('isMultiDayEvent', () => {
  it('returns false for same-day event', () => {
    const start = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const end = new Date(Date.UTC(2025, 0, 15, 17, 0, 0));
    expect(isMultiDayEvent(start, end)).toBe(false);
  });

  it('returns true for multi-day event', () => {
    const start = new Date(Date.UTC(2025, 0, 15, 9, 0, 0));
    const end = new Date(Date.UTC(2025, 0, 17, 17, 0, 0));
    expect(isMultiDayEvent(start, end)).toBe(true);
  });
});

describe('isWithinRange', () => {
  it('returns true for date in range', () => {
    const date = new Date(Date.UTC(2025, 0, 15));
    const start = new Date(Date.UTC(2025, 0, 1));
    const end = new Date(Date.UTC(2025, 0, 31));
    expect(isWithinRange(date, start, end)).toBe(true);
  });

  it('returns true for date at boundaries', () => {
    const date = new Date(Date.UTC(2025, 0, 1));
    const start = new Date(Date.UTC(2025, 0, 1));
    const end = new Date(Date.UTC(2025, 0, 31));
    expect(isWithinRange(date, start, end)).toBe(true);
  });

  it('returns false for date outside range', () => {
    const date = new Date(Date.UTC(2025, 1, 15));
    const start = new Date(Date.UTC(2025, 0, 1));
    const end = new Date(Date.UTC(2025, 0, 31));
    expect(isWithinRange(date, start, end)).toBe(false);
  });
});

describe('doRangesOverlap', () => {
  it('returns true for overlapping ranges', () => {
    const start1 = new Date(Date.UTC(2025, 0, 1));
    const end1 = new Date(Date.UTC(2025, 0, 15));
    const start2 = new Date(Date.UTC(2025, 0, 10));
    const end2 = new Date(Date.UTC(2025, 0, 20));
    expect(doRangesOverlap(start1, end1, start2, end2)).toBe(true);
  });

  it('returns false for non-overlapping ranges', () => {
    const start1 = new Date(Date.UTC(2025, 0, 1));
    const end1 = new Date(Date.UTC(2025, 0, 10));
    const start2 = new Date(Date.UTC(2025, 0, 15));
    const end2 = new Date(Date.UTC(2025, 0, 20));
    expect(doRangesOverlap(start1, end1, start2, end2)).toBe(false);
  });

  it('returns false for touching but not overlapping ranges', () => {
    const start1 = new Date(Date.UTC(2025, 0, 1, 9, 0, 0));
    const end1 = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));
    const start2 = new Date(Date.UTC(2025, 0, 1, 10, 0, 0));
    const end2 = new Date(Date.UTC(2025, 0, 1, 11, 0, 0));
    expect(doRangesOverlap(start1, end1, start2, end2)).toBe(false);
  });
});
