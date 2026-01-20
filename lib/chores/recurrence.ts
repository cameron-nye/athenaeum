/**
 * Recurrence utilities for chore scheduling using RRULE format
 * REQ-5-013: Recurrence expansion utility
 */

import { RRule, Frequency, Weekday, rrulestr } from 'rrule';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurrenceConfig {
  type: RecurrenceType;
  weekday?: number; // 0=Monday, 6=Sunday (RRule uses MO=0)
  monthday?: number; // 1-31
}

/**
 * Generate an RRULE string from a recurrence configuration
 */
export function generateRRule(config: RecurrenceConfig, startDate: Date): string | null {
  if (config.type === 'none') {
    return null;
  }

  const options: Partial<ConstructorParameters<typeof RRule>[0]> = {
    dtstart: startDate,
  };

  switch (config.type) {
    case 'daily':
      options.freq = Frequency.DAILY;
      break;
    case 'weekly':
      options.freq = Frequency.WEEKLY;
      if (config.weekday !== undefined) {
        options.byweekday = [config.weekday];
      }
      break;
    case 'biweekly':
      options.freq = Frequency.WEEKLY;
      options.interval = 2;
      if (config.weekday !== undefined) {
        options.byweekday = [config.weekday];
      }
      break;
    case 'monthly':
      options.freq = Frequency.MONTHLY;
      if (config.monthday !== undefined) {
        options.bymonthday = [config.monthday];
      }
      break;
  }

  const rule = new RRule(options as ConstructorParameters<typeof RRule>[0]);
  return rule.toString();
}

/**
 * Get the next N occurrences from an RRULE string
 */
export function getNextOccurrences(
  rruleString: string | null,
  afterDate: Date,
  count: number = 10
): Date[] {
  if (!rruleString) {
    return [];
  }

  try {
    const rule = rrulestr(rruleString);
    return rule.after(afterDate, true)
      ? rule
          .between(afterDate, new Date(afterDate.getTime() + 365 * 24 * 60 * 60 * 1000), true)
          .slice(0, count)
      : [];
  } catch {
    console.error('Invalid RRULE string:', rruleString);
    return [];
  }
}

/**
 * Get the next single occurrence after a given date
 */
export function getNextOccurrence(rruleString: string | null, afterDate: Date): Date | null {
  if (!rruleString) {
    return null;
  }

  try {
    const rule = rrulestr(rruleString);
    return rule.after(afterDate, false);
  } catch {
    console.error('Invalid RRULE string:', rruleString);
    return null;
  }
}

/**
 * Parse an RRULE string and return a human-readable description
 */
export function parseRRuleToText(rruleString: string | null): string {
  if (!rruleString) {
    return 'One time';
  }

  try {
    const rule = rrulestr(rruleString);
    return rule.toText();
  } catch {
    return 'Custom recurrence';
  }
}

/**
 * Parse an RRULE string to a RecurrenceConfig
 */
export function parseRRuleToConfig(rruleString: string | null): RecurrenceConfig {
  if (!rruleString) {
    return { type: 'none' };
  }

  try {
    const rule = rrulestr(rruleString);
    const options = rule.options;

    // Determine type based on frequency and interval
    let type: RecurrenceType = 'none';
    let weekday: number | undefined;
    let monthday: number | undefined;

    switch (options.freq) {
      case Frequency.DAILY:
        type = 'daily';
        break;
      case Frequency.WEEKLY:
        type = options.interval === 2 ? 'biweekly' : 'weekly';
        if (options.byweekday && options.byweekday.length > 0) {
          const wd = options.byweekday[0];
          weekday = typeof wd === 'number' ? wd : (wd as Weekday).weekday;
        }
        break;
      case Frequency.MONTHLY:
        type = 'monthly';
        if (options.bymonthday && options.bymonthday.length > 0) {
          monthday = options.bymonthday[0];
        }
        break;
    }

    return { type, weekday, monthday };
  } catch {
    return { type: 'none' };
  }
}

/**
 * Day of week labels for UI
 */
export const WEEKDAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/**
 * Short day labels for compact UI
 */
export const WEEKDAY_SHORT_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Convert JavaScript Date.getDay() (0=Sunday) to RRule weekday (0=Monday)
 */
export function jsWeekdayToRRule(jsWeekday: number): number {
  return jsWeekday === 0 ? 6 : jsWeekday - 1;
}

/**
 * Convert RRule weekday (0=Monday) to JavaScript Date.getDay() (0=Sunday)
 */
export function rruleWeekdayToJs(rruleWeekday: number): number {
  return rruleWeekday === 6 ? 0 : rruleWeekday + 1;
}
