import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  parseDisplaySettings,
  isDisplayOnline,
  generateDisplayToken,
  DEFAULT_DISPLAY_SETTINGS,
} from './types';

describe('parseDisplaySettings', () => {
  it('returns default settings for null input', () => {
    const result = parseDisplaySettings(null);
    expect(result).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });

  it('returns default settings for empty object', () => {
    const result = parseDisplaySettings({});
    expect(result).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });

  it('parses valid theme values', () => {
    expect(parseDisplaySettings({ theme: 'light' }).theme).toBe('light');
    expect(parseDisplaySettings({ theme: 'dark' }).theme).toBe('dark');
    expect(parseDisplaySettings({ theme: 'auto' }).theme).toBe('auto');
  });

  it('returns default theme for invalid values', () => {
    expect(parseDisplaySettings({ theme: 'invalid' }).theme).toBe('auto');
    expect(parseDisplaySettings({ theme: 123 }).theme).toBe('auto');
  });

  it('parses valid layout values', () => {
    expect(parseDisplaySettings({ layout: 'calendar' }).layout).toBe('calendar');
    expect(parseDisplaySettings({ layout: 'agenda' }).layout).toBe('agenda');
    expect(parseDisplaySettings({ layout: 'split' }).layout).toBe('split');
  });

  it('returns default layout for invalid values', () => {
    expect(parseDisplaySettings({ layout: 'invalid' }).layout).toBe('calendar');
  });

  it('parses valid widgets object', () => {
    const result = parseDisplaySettings({
      widgetsEnabled: {
        clock: false,
        weather: true,
        upcomingEvents: false,
        chores: false,
      },
    });
    expect(result.widgetsEnabled).toEqual({
      clock: false,
      weather: true,
      upcomingEvents: false,
      chores: false,
    });
  });

  it('uses defaults for partial widgets object', () => {
    const result = parseDisplaySettings({
      widgetsEnabled: { clock: false },
    });
    expect(result.widgetsEnabled).toEqual({
      clock: false,
      weather: false,
      upcomingEvents: true,
      chores: true,
    });
  });

  it('parses valid refreshInterval', () => {
    expect(parseDisplaySettings({ refreshInterval: 10 }).refreshInterval).toBe(10);
    expect(parseDisplaySettings({ refreshInterval: 1 }).refreshInterval).toBe(1);
    expect(parseDisplaySettings({ refreshInterval: 60 }).refreshInterval).toBe(60);
  });

  it('clamps refreshInterval to valid range', () => {
    expect(parseDisplaySettings({ refreshInterval: 0 }).refreshInterval).toBe(5);
    expect(parseDisplaySettings({ refreshInterval: 100 }).refreshInterval).toBe(5);
    expect(parseDisplaySettings({ refreshInterval: 'invalid' }).refreshInterval).toBe(5);
  });

  it('parses valid scheduledReloadTime', () => {
    expect(parseDisplaySettings({ scheduledReloadTime: '03:00' }).scheduledReloadTime).toBe(
      '03:00'
    );
    expect(parseDisplaySettings({ scheduledReloadTime: '23:59' }).scheduledReloadTime).toBe(
      '23:59'
    );
    expect(parseDisplaySettings({ scheduledReloadTime: '00:00' }).scheduledReloadTime).toBe(
      '00:00'
    );
  });

  it('returns default for invalid scheduledReloadTime', () => {
    expect(parseDisplaySettings({ scheduledReloadTime: '25:00' }).scheduledReloadTime).toBe(
      '03:00'
    );
    expect(parseDisplaySettings({ scheduledReloadTime: 'invalid' }).scheduledReloadTime).toBe(
      '03:00'
    );
    expect(parseDisplaySettings({ scheduledReloadTime: '3:00' }).scheduledReloadTime).toBe('03:00');
  });

  it('parses boolean settings', () => {
    expect(parseDisplaySettings({ burnInPreventionEnabled: false }).burnInPreventionEnabled).toBe(
      false
    );
    expect(parseDisplaySettings({ ambientAnimationEnabled: false }).ambientAnimationEnabled).toBe(
      false
    );
    expect(parseDisplaySettings({ use24HourTime: true }).use24HourTime).toBe(true);
  });

  it('returns defaults for non-boolean settings', () => {
    expect(parseDisplaySettings({ burnInPreventionEnabled: 'yes' }).burnInPreventionEnabled).toBe(
      true
    );
    expect(parseDisplaySettings({ use24HourTime: 1 }).use24HourTime).toBe(false);
  });
});

describe('isDisplayOnline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false for null lastSeenAt', () => {
    expect(isDisplayOnline(null)).toBe(false);
  });

  it('returns true if seen within 10 minutes', () => {
    // 5 minutes ago
    expect(isDisplayOnline('2026-01-20T11:55:00Z')).toBe(true);
    // 9 minutes ago
    expect(isDisplayOnline('2026-01-20T11:51:00Z')).toBe(true);
  });

  it('returns false if seen more than 10 minutes ago', () => {
    // 11 minutes ago
    expect(isDisplayOnline('2026-01-20T11:49:00Z')).toBe(false);
    // 1 hour ago
    expect(isDisplayOnline('2026-01-20T11:00:00Z')).toBe(false);
  });

  it('returns true if seen exactly at threshold boundary', () => {
    // Exactly 10 minutes ago - lastSeen equals threshold
    expect(isDisplayOnline('2026-01-20T11:50:00Z')).toBe(false);
    // 9:59 ago
    expect(isDisplayOnline('2026-01-20T11:50:01Z')).toBe(true);
  });
});

describe('generateDisplayToken', () => {
  it('generates a 64-character hex string', () => {
    const token = generateDisplayToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateDisplayToken());
    }
    expect(tokens.size).toBe(100);
  });
});
