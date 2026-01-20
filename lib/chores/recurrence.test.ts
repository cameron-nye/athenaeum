import { describe, it, expect } from 'vitest';
import {
  generateRRule,
  getNextOccurrences,
  getNextOccurrence,
  parseRRuleToText,
  parseRRuleToConfig,
  jsWeekdayToRRule,
  rruleWeekdayToJs,
} from './recurrence';

describe('generateRRule', () => {
  const startDate = new Date('2026-01-20T10:00:00Z');

  it('returns null for none type', () => {
    expect(generateRRule({ type: 'none' }, startDate)).toBeNull();
  });

  it('generates daily RRULE', () => {
    const result = generateRRule({ type: 'daily' }, startDate);
    expect(result).toContain('FREQ=DAILY');
  });

  it('generates weekly RRULE', () => {
    const result = generateRRule({ type: 'weekly' }, startDate);
    expect(result).toContain('FREQ=WEEKLY');
    expect(result).not.toContain('INTERVAL=2');
  });

  it('generates weekly RRULE with specific weekday', () => {
    const result = generateRRule({ type: 'weekly', weekday: 0 }, startDate); // Monday
    expect(result).toContain('FREQ=WEEKLY');
    expect(result).toContain('BYDAY=MO');
  });

  it('generates biweekly RRULE', () => {
    const result = generateRRule({ type: 'biweekly' }, startDate);
    expect(result).toContain('FREQ=WEEKLY');
    expect(result).toContain('INTERVAL=2');
  });

  it('generates monthly RRULE', () => {
    const result = generateRRule({ type: 'monthly' }, startDate);
    expect(result).toContain('FREQ=MONTHLY');
  });

  it('generates monthly RRULE with specific day', () => {
    const result = generateRRule({ type: 'monthly', monthday: 15 }, startDate);
    expect(result).toContain('FREQ=MONTHLY');
    expect(result).toContain('BYMONTHDAY=15');
  });
});

describe('getNextOccurrences', () => {
  const startDate = new Date('2026-01-20T10:00:00Z');
  const afterDate = new Date('2026-01-20T10:00:00Z');

  it('returns empty array for null rrule', () => {
    expect(getNextOccurrences(null, afterDate)).toEqual([]);
  });

  it('returns empty array for invalid rrule', () => {
    expect(getNextOccurrences('invalid', afterDate)).toEqual([]);
  });

  it('returns multiple occurrences for daily rule', () => {
    const rrule = generateRRule({ type: 'daily' }, startDate)!;
    const occurrences = getNextOccurrences(rrule, afterDate, 5);
    expect(occurrences).toHaveLength(5);
  });

  it('returns occurrences for weekly rule', () => {
    const rrule = generateRRule({ type: 'weekly' }, startDate)!;
    const occurrences = getNextOccurrences(rrule, afterDate, 4);
    expect(occurrences.length).toBeGreaterThanOrEqual(1);
  });

  it('respects count parameter', () => {
    const rrule = generateRRule({ type: 'daily' }, startDate)!;
    const occurrences = getNextOccurrences(rrule, afterDate, 3);
    expect(occurrences).toHaveLength(3);
  });
});

describe('getNextOccurrence', () => {
  const startDate = new Date('2026-01-20T10:00:00Z');

  it('returns null for null rrule', () => {
    expect(getNextOccurrence(null, startDate)).toBeNull();
  });

  it('returns null for invalid rrule', () => {
    expect(getNextOccurrence('invalid', startDate)).toBeNull();
  });

  it('returns next date for daily rule', () => {
    const rrule = generateRRule({ type: 'daily' }, startDate)!;
    const next = getNextOccurrence(rrule, startDate);
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThan(startDate.getTime());
  });
});

describe('parseRRuleToText', () => {
  const startDate = new Date('2026-01-20T10:00:00Z');

  it('returns "One time" for null', () => {
    expect(parseRRuleToText(null)).toBe('One time');
  });

  it('returns human-readable text for daily', () => {
    const rrule = generateRRule({ type: 'daily' }, startDate)!;
    const text = parseRRuleToText(rrule);
    expect(text.toLowerCase()).toContain('day');
  });

  it('returns human-readable text for weekly', () => {
    const rrule = generateRRule({ type: 'weekly' }, startDate)!;
    const text = parseRRuleToText(rrule);
    expect(text.toLowerCase()).toContain('week');
  });

  it('returns fallback for invalid rrule', () => {
    expect(parseRRuleToText('invalid')).toBe('Custom recurrence');
  });
});

describe('parseRRuleToConfig', () => {
  const startDate = new Date('2026-01-20T10:00:00Z');

  it('returns none for null', () => {
    expect(parseRRuleToConfig(null)).toEqual({ type: 'none' });
  });

  it('parses daily rule', () => {
    const rrule = generateRRule({ type: 'daily' }, startDate)!;
    expect(parseRRuleToConfig(rrule).type).toBe('daily');
  });

  it('parses weekly rule', () => {
    const rrule = generateRRule({ type: 'weekly' }, startDate)!;
    expect(parseRRuleToConfig(rrule).type).toBe('weekly');
  });

  it('parses biweekly rule', () => {
    const rrule = generateRRule({ type: 'biweekly' }, startDate)!;
    expect(parseRRuleToConfig(rrule).type).toBe('biweekly');
  });

  it('parses monthly rule', () => {
    const rrule = generateRRule({ type: 'monthly' }, startDate)!;
    expect(parseRRuleToConfig(rrule).type).toBe('monthly');
  });

  it('parses weekly rule with weekday', () => {
    const rrule = generateRRule({ type: 'weekly', weekday: 2 }, startDate)!; // Wednesday
    const config = parseRRuleToConfig(rrule);
    expect(config.type).toBe('weekly');
    expect(config.weekday).toBe(2);
  });

  it('parses monthly rule with monthday', () => {
    const rrule = generateRRule({ type: 'monthly', monthday: 15 }, startDate)!;
    const config = parseRRuleToConfig(rrule);
    expect(config.type).toBe('monthly');
    expect(config.monthday).toBe(15);
  });

  it('returns none for invalid rrule', () => {
    expect(parseRRuleToConfig('invalid')).toEqual({ type: 'none' });
  });
});

describe('weekday conversions', () => {
  it('converts JS Sunday (0) to RRule (6)', () => {
    expect(jsWeekdayToRRule(0)).toBe(6);
  });

  it('converts JS Monday (1) to RRule (0)', () => {
    expect(jsWeekdayToRRule(1)).toBe(0);
  });

  it('converts JS Saturday (6) to RRule (5)', () => {
    expect(jsWeekdayToRRule(6)).toBe(5);
  });

  it('converts RRule Monday (0) to JS (1)', () => {
    expect(rruleWeekdayToJs(0)).toBe(1);
  });

  it('converts RRule Sunday (6) to JS (0)', () => {
    expect(rruleWeekdayToJs(6)).toBe(0);
  });

  it('round-trips correctly', () => {
    for (let i = 0; i < 7; i++) {
      expect(rruleWeekdayToJs(jsWeekdayToRRule(i))).toBe(i);
    }
  });
});
